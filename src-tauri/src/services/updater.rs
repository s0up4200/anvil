use tauri::{AppHandle, Emitter};

use crate::models::SkillUpdate;
use crate::services::{lockfile, skills_cli};

/// Run a background update check. Meant to be spawned on a new thread from lib.rs setup.
///
/// - If the skills CLI is unavailable, emits `skills-cli-unavailable` and returns.
/// - Otherwise runs `npx skills check`, cross-references the lockfile, and emits
///   `skill-updates-available` with a list of outdated skills.
pub fn run_background_check(app: AppHandle) {
    if !skills_cli::check_cli_available() {
        let _ = app.emit("skills-cli-unavailable", ());
        return;
    }

    let check_output = match skills_cli::run_check() {
        Ok(output) => output,
        Err(_) => return,
    };

    // If all skills are up to date, the output contains "All skills are up to date"
    if check_output.contains("All skills are up to date") {
        let _ = app.emit("skill-updates-available", Vec::<SkillUpdate>::new());
        return;
    }

    // Parse outdated skills from check output.
    // The `npx skills check` output uses "↑" or similar markers for outdated skills.
    // Format varies, but skill names appear after update indicators.
    let updates = parse_check_output(&check_output);
    let _ = app.emit("skill-updates-available", &updates);
}

/// Parse the output of `npx skills check` and cross-reference with the lockfile
/// to build a list of skill updates.
fn parse_check_output(output: &str) -> Vec<SkillUpdate> {
    let lockfile = lockfile::read_lockfile().unwrap_or_default();
    let mut updates = Vec::new();

    for line in output.lines() {
        let trimmed = line.trim();
        // Look for lines with update indicators (↑, arrows, or "outdated" markers)
        // Common patterns: "↑ skill-name" or "  skill-name  outdated"
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
        }
    }

    updates
}

/// Try to extract a skill name from a line that indicates it's outdated.
fn extract_outdated_skill(line: &str) -> Option<String> {
    // Pattern 1: starts with "↑" (common in skills CLI output)
    if line.starts_with('↑') || line.starts_with("↑") {
        let name = line.trim_start_matches('↑').trim_start_matches("↑").trim();
        if !name.is_empty() {
            return Some(name.to_string());
        }
    }

    // Pattern 2: contains "outdated" or "update available"
    // These are less reliable, skip for now — the ↑ pattern is the primary one

    None
}

impl Default for crate::models::Lockfile {
    fn default() -> Self {
        Self {
            version: 3,
            skills: Default::default(),
        }
    }
}
