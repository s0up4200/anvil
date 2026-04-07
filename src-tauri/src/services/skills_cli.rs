use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};

use tauri::{AppHandle, Emitter};

use crate::error::AppError;
use crate::models::MarketplaceSkill;

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

    let raw = String::from_utf8_lossy(&output.stdout);
    Ok(strip_ansi(&raw))
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
    use super::*;

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
}
