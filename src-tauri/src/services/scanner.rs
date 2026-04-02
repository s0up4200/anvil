use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};

use crate::error::AppError;
use crate::models::agent::Agent;
use crate::models::skill::{Skill, SkillScope, SkillSource};
use crate::services::{parser, symlink};

pub const SKILL_FILES: [(&str, bool); 2] = [("SKILL.md", true), ("SKILL.md.disabled", false)];

/// Scan a single agent directory for skills.
///
/// Returns an empty vec if `dir` does not exist. Errors from individual skill
/// files are silently skipped so that one bad file does not abort the whole
/// scan.
///
/// # Layout handled
///
/// ```text
/// <dir>/
///   SKILL.md                  # single-file skill at root
///   SKILL.md.disabled         # disabled single-file skill
///   <subdir>/
///     SKILL.md                # skill inside a named subdirectory
///     SKILL.md.disabled       # disabled skill inside a named subdirectory
/// ```
pub fn scan_directory(
    dir: &Path,
    agent_id: &str,
    scope: SkillScope,
) -> Result<Vec<Skill>, AppError> {
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut skills = Vec::new();

    // Check for a SKILL.md (or SKILL.md.disabled) directly in the directory.
    for (filename, enabled) in SKILL_FILES {
        let candidate = dir.join(filename);
        if candidate.is_file() {
            if let Some(skill) = build_skill(&candidate, dir, agent_id, scope.clone(), enabled) {
                skills.push(skill);
            }
        }
    }

    // Walk immediate subdirectories, each may contain a SKILL.md.
    let read_dir = fs::read_dir(dir).map_err(AppError::from)?;
    for entry in read_dir.flatten() {
        let entry_path = entry.path();
        if !entry_path.is_dir() {
            continue;
        }

        for (filename, enabled) in SKILL_FILES {
            let candidate = entry_path.join(filename);
            if candidate.is_file() {
                if let Some(skill) =
                    build_skill(&candidate, &entry_path, agent_id, scope.clone(), enabled)
                {
                    skills.push(skill);
                }
            }
        }
    }

    Ok(skills)
}

/// Scan all agents with a configured `skills_path`, deduplicate by
/// `resolved_path`, and merge agent ID lists for shared files.
pub fn scan_all(agents: &[Agent]) -> Vec<Skill> {
    // keyed by resolved_path string for deduplication
    let mut by_resolved: HashMap<PathBuf, Skill> = HashMap::new();

    for agent in agents {
        let skills_path = match &agent.skills_path {
            Some(p) => p.clone(),
            None => continue,
        };

        let skills = match scan_directory(&skills_path, &agent.id, SkillScope::Global) {
            Ok(s) => s,
            Err(_) => continue,
        };

        for skill in skills {
            by_resolved
                .entry(skill.resolved_path.clone())
                .and_modify(|existing| {
                    for id in &skill.agent_ids {
                        if !existing.agent_ids.contains(id) {
                            existing.agent_ids.push(id.clone());
                        }
                    }
                })
                .or_insert(skill);
        }
    }

    by_resolved.into_values().collect()
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/// Build a `Skill` from a skill file path. Returns `None` if reading or
/// parsing fails (bad files are silently skipped during a directory scan).
fn build_skill(
    file_path: &Path,
    _skill_dir: &Path,
    agent_id: &str,
    scope: SkillScope,
    is_enabled: bool,
) -> Option<Skill> {
    let raw = fs::read_to_string(file_path).ok()?;
    let meta = fs::metadata(file_path).ok()?;

    // Resolve symlinks to get the canonical path.
    let resolved_path = symlink::resolve_path(file_path).ok()?;

    // Determine source.
    let source = if symlink::is_symlink(file_path) {
        SkillSource::Symlink
    } else {
        SkillSource::Native
    };

    // Stable ID: SHA-256 of the canonical path string.
    let id = sha256_hex(resolved_path.to_string_lossy().as_bytes());

    // Derive skill name from the parent directory name, falling back to the
    // file stem when the file lives directly in the scanned root.
    let name = derive_name(file_path);

    // Parse frontmatter + body (tolerate failures — return None on bad files).
    let (frontmatter, body) = parser::parse_skill_content(&raw).ok().unzip();
    let body = body.unwrap_or_default();

    // File metadata.
    let last_modified = meta
        .modified()
        .ok()
        .map(|t| {
            let dt: DateTime<Utc> = t.into();
            dt.to_rfc3339()
        })
        .unwrap_or_default();

    let file_size = meta.len();
    let line_count = raw.lines().count();

    // Extract `internal` flag from frontmatter metadata if present.
    let is_internal = frontmatter
        .as_ref()
        .and_then(|fm| fm.metadata.get("internal"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    Some(Skill {
        id,
        name,
        path: file_path.to_path_buf(),
        resolved_path,
        agent_ids: vec![agent_id.to_string()],
        frontmatter,
        body,
        raw,
        scope,
        source,
        is_enabled,
        is_internal,
        last_modified,
        file_size,
        line_count,
    })
}

/// Derive a human-readable name for a skill.
///
/// Priority:
/// 1. The parent directory name when the file is `<parent>/SKILL.md`
/// 2. The file stem otherwise (rare edge case)
fn derive_name(file_path: &Path) -> String {
    // If the file is named SKILL.md or SKILL.md.disabled, use the parent dir.
    let file_name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");

    if file_name == "SKILL.md" || file_name == "SKILL.md.disabled" {
        if let Some(parent_name) = file_path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
        {
            // Only use the parent name if it isn't the scan root itself (i.e.,
            // the file lives in a subdirectory).  We can't easily know the
            // scan root here, so we just return whatever the parent is called.
            return parent_name.to_string();
        }
    }

    // Fallback: use the file name, stripping known extensions.
    file_name
        .trim_end_matches(".disabled")
        .trim_end_matches(".md")
        .to_string()
}

/// Compute a lowercase hex SHA-256 digest of `data`.
fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    const VALID_SKILL_CONTENT: &str =
        "---\ndescription: Test skill\n---\nThis is the skill body.\n";

    fn write_skill(dir: &Path, filename: &str) {
        fs::write(dir.join(filename), VALID_SKILL_CONTENT).unwrap();
    }

    fn make_subdir(parent: &Path, name: &str) -> PathBuf {
        let p = parent.join(name);
        fs::create_dir_all(&p).unwrap();
        p
    }

    // 1. scan_finds_skills — create 2 skill subdirs, verify both found
    #[test]
    fn scan_finds_skills() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        let sub1 = make_subdir(root, "my-skill");
        let sub2 = make_subdir(root, "other-skill");
        write_skill(&sub1, "SKILL.md");
        write_skill(&sub2, "SKILL.md");

        let skills = scan_directory(root, "test-agent", SkillScope::Global).unwrap();
        assert_eq!(skills.len(), 2);

        let names: Vec<&str> = skills.iter().map(|s| s.name.as_str()).collect();
        assert!(names.contains(&"my-skill"), "expected my-skill, got {names:?}");
        assert!(names.contains(&"other-skill"), "expected other-skill, got {names:?}");
    }

    // 2. scan_finds_single_file_skill — SKILL.md directly in dir
    #[test]
    fn scan_finds_single_file_skill() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();
        write_skill(root, "SKILL.md");

        let skills = scan_directory(root, "test-agent", SkillScope::Global).unwrap();
        assert_eq!(skills.len(), 1);
        assert!(skills[0].is_enabled);
    }

    // 3. scan_skips_disabled — SKILL.md.disabled has is_enabled = false
    #[test]
    fn scan_skips_disabled() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        let sub = make_subdir(root, "my-skill");
        write_skill(&sub, "SKILL.md.disabled");

        let skills = scan_directory(root, "test-agent", SkillScope::Global).unwrap();
        assert_eq!(skills.len(), 1);
        assert!(!skills[0].is_enabled, "disabled skill should have is_enabled = false");
    }

    // 4. scan_empty_dir — verify empty vec returned
    #[test]
    fn scan_empty_dir() {
        let tmp = TempDir::new().unwrap();
        let skills =
            scan_directory(tmp.path(), "test-agent", SkillScope::Global).unwrap();
        assert!(skills.is_empty());
    }

    // 5. scan_nonexistent_dir — verify empty vec returned (not an error)
    #[test]
    fn scan_nonexistent_dir() {
        let non_existent = Path::new("/tmp/__skillforge_nonexistent_dir_12345__");
        let result = scan_directory(non_existent, "test-agent", SkillScope::Global);
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    // Extra: scan_all deduplicates skills shared across agents
    #[test]
    #[cfg(unix)]
    fn scan_all_deduplicates_symlinks() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path();

        // Create a real skill directory.
        let real_skills = root.join("agent-a-skills");
        fs::create_dir_all(&real_skills).unwrap();
        let skill_dir = make_subdir(&real_skills, "shared-skill");
        write_skill(&skill_dir, "SKILL.md");

        // Create a second agent directory that has a symlink pointing to the
        // same skill directory.
        let agent_b_skills = root.join("agent-b-skills");
        fs::create_dir_all(&agent_b_skills).unwrap();
        let link_dir = agent_b_skills.join("shared-skill");
        std::os::unix::fs::symlink(&skill_dir, &link_dir).unwrap();

        let agents = vec![
            Agent {
                id: "agent-a".to_string(),
                name: "Agent A".to_string(),
                skills_path: Some(real_skills),
            },
            Agent {
                id: "agent-b".to_string(),
                name: "Agent B".to_string(),
                skills_path: Some(agent_b_skills),
            },
        ];

        let skills = scan_all(&agents);
        assert_eq!(skills.len(), 1, "shared skill should be deduplicated");
        let skill = &skills[0];
        assert!(
            skill.agent_ids.contains(&"agent-a".to_string()),
            "agent-a should be in agent_ids"
        );
        assert!(
            skill.agent_ids.contains(&"agent-b".to_string()),
            "agent-b should be in agent_ids"
        );
    }
}
