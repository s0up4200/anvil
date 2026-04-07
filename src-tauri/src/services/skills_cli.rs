use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

use tauri::{AppHandle, Emitter};

use crate::error::AppError;
use crate::models::{Lockfile, MarketplaceSkill, SkillCheckResult, SkillUpdate, SkippedSkill};

/// Resolve the full path to `npx` using the user's shell.
/// Tauri apps on macOS inherit a minimal PATH, so we use `sh -c` to get
/// the real path from the user's shell profile.
pub fn resolve_npx() -> Result<String, AppError> {
    let output = Command::new("sh")
        .args(["-lc", "command -v npx"])
        .output()
        .map_err(|e| AppError::CliNotFound(format!("Failed to locate npx: {e}")))?;

    if !output.status.success() {
        return Err(AppError::CliNotFound(
            "npx not found. Install Node.js to use marketplace features.".into(),
        ));
    }

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        return Err(AppError::CliNotFound("npx not found on PATH".into()));
    }
    Ok(path)
}

/// Check if `npx skills` is available.
pub fn check_cli_available() -> bool {
    let npx = match resolve_npx() {
        Ok(p) => p,
        Err(_) => return false,
    };
    Command::new(&npx)
        .args(["skills", "--version"])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Strip ANSI escape sequences from a string.
fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1B' {
            // Skip ESC [ ... (letter) sequences
            if chars.peek() == Some(&'[') {
                chars.next(); // consume '['
                // Consume until we hit a letter or run out
                while let Some(&next) = chars.peek() {
                    chars.next();
                    if next.is_ascii_alphabetic() {
                        break;
                    }
                }
            }
            // Also skip ESC sequences like cursor show/hide: ESC [ ? ...
            continue;
        }
        result.push(c);
    }
    result
}

/// Search for skills using `npx skills find <query>`.
/// Parses the ANSI output to extract skill entries.
pub fn search(query: &str) -> Result<Vec<MarketplaceSkill>, AppError> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }

    let npx = resolve_npx()?;
    let output = Command::new(&npx)
        .args(["skills", "find", query])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| AppError::CliError(format!("Failed to run skills find: {e}")))?;

    let raw = String::from_utf8_lossy(&output.stdout);
    let clean = strip_ansi(&raw);
    parse_find_output(&clean)
}

/// Parse the cleaned output of `npx skills find <query>`.
///
/// Expected format per result (after ANSI stripping):
/// ```text
/// owner/repo@skill  4.5K installs
/// ↗ https://skills.sh/owner/repo/skill
/// ```
fn parse_find_output(output: &str) -> Result<Vec<MarketplaceSkill>, AppError> {
    let mut results = Vec::new();
    let lines: Vec<&str> = output.lines().collect();

    let mut i = 0;
    while i < lines.len() {
        let line = lines[i].trim();

        // Look for lines matching "owner/repo@skill  NNK installs"
        if let Some(skill) = try_parse_skill_line(line) {
            // Next line might be the URL
            let url = if i + 1 < lines.len() {
                let next = lines[i + 1].trim();
                if next.contains("https://skills.sh/") {
                    // Extract URL from the line (may have leading chars like ↗)
                    extract_url(next).unwrap_or_default()
                } else {
                    String::new()
                }
            } else {
                String::new()
            };

            results.push(MarketplaceSkill {
                package: skill.package,
                name: skill.name,
                source: skill.source,
                description: String::new(),
                install_count: skill.install_count,
                url,
            });
        }
        i += 1;
    }

    Ok(results)
}

struct ParsedSkillLine {
    package: String,
    name: String,
    source: String,
    install_count: String,
}

fn try_parse_skill_line(line: &str) -> Option<ParsedSkillLine> {
    // Pattern: "owner/repo@skill  N installs" or "owner/repo@skill  4.5K installs"
    // The package part contains exactly one '@'
    let parts: Vec<&str> = line.splitn(2, char::is_whitespace).collect();
    if parts.len() < 2 {
        return None;
    }

    let package_str = parts[0].trim();
    if !package_str.contains('/') || !package_str.contains('@') {
        return None;
    }

    // Extract install count — everything after the package, trimmed
    let install_count = parts[1].trim().to_string();
    if !install_count.contains("install") {
        return None;
    }

    // Parse owner/repo@skill
    let at_pos = package_str.find('@')?;
    let source = &package_str[..at_pos];
    let name = &package_str[at_pos + 1..];

    Some(ParsedSkillLine {
        package: package_str.to_string(),
        name: name.to_string(),
        source: source.to_string(),
        install_count,
    })
}

fn extract_url(line: &str) -> Option<String> {
    let start = line.find("https://")?;
    Some(line[start..].trim().to_string())
}

/// Spawn `npx skills <args>`, stream stdout lines as Tauri events, and wait
/// for exit.  Shared by install / update / remove.
fn spawn_and_stream(args: &[&str], event: &str, app: &AppHandle) -> Result<(), AppError> {
    let npx = resolve_npx()?;

    let mut child = Command::new(&npx)
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| AppError::CliError(format!("Failed to spawn `npx {}`: {e}", args.join(" "))))?;

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                let clean = strip_ansi(&line);
                let _ = app.emit(event, &clean);
            }
        }
    }

    let status = child
        .wait()
        .map_err(|e| AppError::CliError(format!("`npx {}` process error: {e}", args.join(" "))))?;

    if !status.success() {
        return Err(AppError::CliError(format!("`npx {}` failed", args.join(" "))));
    }

    Ok(())
}

/// Run `npx skills add <package> -g -y` and stream stdout as events.
/// Installs globally to the vault (~/.agents/skills/) and auto-symlinks to all agents.
pub fn run_install(package: &str, app: &AppHandle) -> Result<(), AppError> {
    spawn_and_stream(
        &["skills", "add", package, "-g", "-y"],
        "marketplace-install-progress",
        app,
    )
}

/// Run `npx skills check` and return the raw (ANSI-stripped) output.
pub fn run_check() -> Result<String, AppError> {
    let npx = resolve_npx()?;
    let output = Command::new(&npx)
        .args(["skills", "check"])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| AppError::CliError(format!("Failed to run skills check: {e}")))?;

    let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
    let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));

    if !output.status.success() {
        let detail = stderr
            .trim()
            .split('\n')
            .find(|line| !line.trim().is_empty())
            .map(str::trim)
            .filter(|line| !line.is_empty())
            .or_else(|| {
                stdout
                    .trim()
                    .split('\n')
                    .find(|line| !line.trim().is_empty())
                    .map(str::trim)
            })
            .unwrap_or("Unknown error");

        return Err(AppError::CliError(format!(
            "`npx skills check` failed: {detail}"
        )));
    }

    Ok(stdout)
}

pub fn parse_check_output(output: &str, lockfile: &Lockfile) -> SkillCheckResult {
    let mut updates = Vec::new();
    let mut skipped_skills = Vec::new();
    let mut active_skipped_skill: Option<usize> = None;

    for line in output.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            continue;
        }

        if let Some(skill_name) = extract_outdated_skill(trimmed) {
            let (source_repo, local_hash, installed_at) =
                if let Some(entry) = lockfile.skills.get(&skill_name) {
                    (
                        entry.source.clone(),
                        entry.skill_folder_hash.clone(),
                        entry.installed_at.clone(),
                    )
                } else {
                    (String::new(), String::new(), String::new())
                };

            updates.push(SkillUpdate {
                skill_name,
                local_hash,
                source_repo,
                installed_at,
            });
            active_skipped_skill = None;
            continue;
        }

        if let Some(skill_name) = extract_skipped_skill_name(trimmed) {
            skipped_skills.push(SkippedSkill {
                skill_name,
                source_repo: String::new(),
            });
            active_skipped_skill = Some(skipped_skills.len() - 1);
            continue;
        }

        if let Some(source_repo) = extract_skipped_source(trimmed) {
            if let Some(index) = active_skipped_skill {
                skipped_skills[index].source_repo = source_repo;
            }
            continue;
        }

        active_skipped_skill = None;
    }

    SkillCheckResult {
        updates,
        skipped_skills,
    }
}

fn extract_outdated_skill(line: &str) -> Option<String> {
    if line.starts_with('↑') {
        let name = line.trim_start_matches('↑').trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }

    None
}

fn extract_skipped_skill_name(line: &str) -> Option<String> {
    if line.starts_with('✗') {
        let name = line.trim_start_matches('✗').trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }

    None
}

fn extract_skipped_source(line: &str) -> Option<String> {
    line.strip_prefix("source:")
        .map(str::trim)
        .filter(|source| !source.is_empty())
        .map(ToString::to_string)
}

/// Run `npx skills update --yes` (optionally targeted) and stream progress events.
pub fn run_update(skill_name: Option<&str>, app: &AppHandle) -> Result<(), AppError> {
    let mut args = vec!["skills", "update", "--yes"];
    let skill_flag;
    if let Some(name) = skill_name {
        skill_flag = name.to_string();
        args.push("--skill");
        args.push(&skill_flag);
    }

    spawn_and_stream(&args, "marketplace-update-progress", app)
}

/// Run `npx skills remove <name> [-g] [--agent <id>] -y` and stream progress events.
///
/// When `agent_id` is `Some`, removes from that specific agent only.
/// When `agent_id` is `None`, removes globally (vault + all agents + lockfile entry).
pub fn run_remove(skill_name: &str, agent_id: Option<&str>, app: &AppHandle) -> Result<(), AppError> {
    let mut args = vec!["skills", "remove", skill_name, "-y"];
    let agent_flag;
    if let Some(id) = agent_id {
        agent_flag = id.to_string();
        args.push("--agent");
        args.push(&agent_flag);
    } else {
        args.push("-g");
    }

    spawn_and_stream(&args, "marketplace-remove-progress", app)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;
    use crate::models::{Lockfile, LockfileEntry};

    #[test]
    fn test_strip_ansi() {
        let input = "\x1B[38;5;145mresend/resend-skills@resend\x1B[0m \x1B[36m4.5K installs\x1B[0m";
        let clean = strip_ansi(input);
        assert_eq!(clean, "resend/resend-skills@resend 4.5K installs");
    }

    #[test]
    fn test_strip_ansi_complex() {
        let input = "\x1B[?25l\x1B[J\x1B[38;5;102msome text\x1B[0m";
        let clean = strip_ansi(input);
        assert_eq!(clean, "some text");
    }

    #[test]
    fn test_parse_find_output() {
        let output = r#"
Install with npx skills add <owner/repo@skill>

resend/resend-skills@resend 4.5K installs
 https://skills.sh/resend/resend-skills/resend

resend/email-best-practices@email-best-practices 4.3K installs
 https://skills.sh/resend/email-best-practices/email-best-practices
"#;
        let results = parse_find_output(output).unwrap();
        assert_eq!(results.len(), 2);

        assert_eq!(results[0].package, "resend/resend-skills@resend");
        assert_eq!(results[0].name, "resend");
        assert_eq!(results[0].source, "resend/resend-skills");
        assert_eq!(results[0].install_count, "4.5K installs");
        assert_eq!(results[0].url, "https://skills.sh/resend/resend-skills/resend");

        assert_eq!(results[1].name, "email-best-practices");
    }

    #[test]
    fn test_parse_find_no_results() {
        let output = "No skills found for \"zzzznonexistent\"\n";
        let results = parse_find_output(output).unwrap();
        assert!(results.is_empty());
    }

    #[test]
    fn test_try_parse_skill_line_valid() {
        let line = "resend/resend-skills@resend 4.5K installs";
        let parsed = try_parse_skill_line(line).unwrap();
        assert_eq!(parsed.name, "resend");
        assert_eq!(parsed.source, "resend/resend-skills");
    }

    #[test]
    fn test_try_parse_skill_line_invalid() {
        assert!(try_parse_skill_line("some random text").is_none());
        assert!(try_parse_skill_line("no-at-sign/here 100 installs").is_none());
        assert!(try_parse_skill_line("").is_none());
    }

    #[test]
    fn test_parse_check_output_returns_updates_and_skipped_skills() {
        let mut skills = HashMap::new();
        skills.insert(
            "resend".to_string(),
            LockfileEntry {
                source: "resend/resend-skills".to_string(),
                source_type: String::new(),
                source_url: String::new(),
                skill_path: String::new(),
                skill_folder_hash: "hash-123".to_string(),
                installed_at: "2026-04-01T00:00:00Z".to_string(),
                updated_at: String::new(),
            },
        );
        let lockfile = Lockfile { version: 3, skills };

        let output = r#"
↑ resend

✓ All skills are up to date

Could not check 2 skill(s) (may need reinstall)

  ✗ clerk
    source: clerk/skills
  ✗ emotional-awareness
    source: s0up4200/skills
"#;

        let result = parse_check_output(output, &lockfile);

        assert_eq!(result.updates.len(), 1);
        assert_eq!(result.updates[0].skill_name, "resend");
        assert_eq!(result.updates[0].source_repo, "resend/resend-skills");
        assert_eq!(result.updates[0].local_hash, "hash-123");
        assert_eq!(result.updates[0].installed_at, "2026-04-01T00:00:00Z");

        assert_eq!(result.skipped_skills.len(), 2);
        assert_eq!(result.skipped_skills[0].skill_name, "clerk");
        assert_eq!(result.skipped_skills[0].source_repo, "clerk/skills");
        assert_eq!(result.skipped_skills[1].skill_name, "emotional-awareness");
        assert_eq!(result.skipped_skills[1].source_repo, "s0up4200/skills");
    }

    #[test]
    fn test_parse_check_output_does_not_treat_partial_failures_as_clean_success() {
        let output = r#"
✓ All skills are up to date

Could not check 1 skill(s) (may need reinstall)

  ✗ clerk
    source: clerk/skills
"#;

        let result = parse_check_output(output, &Lockfile {
            version: 3,
            skills: HashMap::new(),
        });

        assert!(result.updates.is_empty());
        assert_eq!(result.skipped_skills.len(), 1);
        assert_eq!(result.skipped_skills[0].skill_name, "clerk");
    }
}
