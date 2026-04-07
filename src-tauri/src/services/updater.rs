use tauri::{AppHandle, Emitter};

use crate::services::{lockfile, skills_cli};

/// Run a background update check. Meant to be spawned on a new thread from lib.rs setup.
///
/// - If the skills CLI is unavailable, emits `skills-cli-unavailable` and returns.
/// - Otherwise runs `npx skills check`, cross-references the lockfile, and emits
///   `skill-updates-available` with a list of outdated skills.
pub fn run_background_check(app: AppHandle) {
    if !skills_cli::check_cli_available() {
        let _ = app.emit("skills-cli-unavailable", ());
        let _ = app.emit(
            "skill-update-check-error",
            "Marketplace CLI unavailable. Install Node.js to use marketplace features.",
        );
        return;
    }

    let check_output = match skills_cli::run_check() {
        Ok(output) => output,
        Err(err) => {
            let _ = app.emit("skill-update-check-error", err.to_string());
            return;
        }
    };

    let lockfile = lockfile::read_lockfile().unwrap_or_default();
    let result = skills_cli::parse_check_output(&check_output, &lockfile);
    let _ = app.emit("skill-updates-available", &result);
}

impl Default for crate::models::Lockfile {
    fn default() -> Self {
        Self {
            version: 3,
            skills: Default::default(),
        }
    }
}
