use tauri::AppHandle;

use crate::error::AppError;
use crate::models::{LockfileEntry, MarketplaceSkill, SkillDiff, SkillUpdate};
use crate::services::{lockfile, skills_cli};

#[tauri::command]
pub async fn search_marketplace(query: String) -> Result<Vec<MarketplaceSkill>, AppError> {
    tokio::task::spawn_blocking(move || skills_cli::search(&query))
        .await
        .map_err(|e| AppError::CliError(format!("Search task failed: {e}")))?
}

#[tauri::command]
pub async fn install_from_marketplace(
    package: String,
    app: AppHandle,
) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || skills_cli::run_install(&package, &app))
        .await
        .map_err(|e| AppError::CliError(format!("Install task failed: {e}")))?
}

#[tauri::command]
pub async fn check_skill_updates() -> Result<Vec<SkillUpdate>, AppError> {
    tokio::task::spawn_blocking(move || {
        let check_output = skills_cli::run_check()?;

        if check_output.contains("All skills are up to date") {
            return Ok(vec![]);
        }

        let lock = lockfile::read_lockfile()?;
        let mut updates = Vec::new();

        for line in check_output.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('↑') || trimmed.starts_with("↑") {
                let name = trimmed
                    .trim_start_matches('↑')
                    .trim_start_matches("↑")
                    .trim();
                if !name.is_empty() {
                    let (source_repo, local_hash, installed_at) =
                        if let Some(entry) = lock.skills.get(name) {
                            (
                                entry.source.clone(),
                                entry.skill_folder_hash.clone(),
                                entry.installed_at.clone(),
                            )
                        } else {
                            (String::new(), String::new(), String::new())
                        };

                    updates.push(SkillUpdate {
                        skill_name: name.to_string(),
                        local_hash,
                        source_repo,
                        installed_at,
                    });
                }
            }
        }

        Ok(updates)
    })
    .await
    .map_err(|e| AppError::CliError(format!("Check task failed: {e}")))?
}

#[tauri::command]
pub async fn update_marketplace_skill(
    skill_name: String,
    app: AppHandle,
) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || skills_cli::run_update(Some(&skill_name), &app))
        .await
        .map_err(|e| AppError::CliError(format!("Update task failed: {e}")))?
}

#[tauri::command]
pub async fn update_all_skills(app: AppHandle) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || skills_cli::run_update(None, &app))
        .await
        .map_err(|e| AppError::CliError(format!("Update all task failed: {e}")))?
}

#[tauri::command]
pub fn read_skill_lockfile() -> Result<Vec<(String, LockfileEntry)>, AppError> {
    let lock = lockfile::read_lockfile()?;
    Ok(lock.skills.into_iter().collect())
}

#[tauri::command]
pub async fn diff_remote_skill(skill_name: String) -> Result<SkillDiff, AppError> {
    let lock = lockfile::read_lockfile()?;
    let entry = lock.skills.get(&skill_name).ok_or_else(|| {
        AppError::NotFound(format!("Skill '{skill_name}' not found in lockfile"))
    })?;

    // Build raw GitHub URL from source_url + skill_path
    let source_url = entry
        .source_url
        .trim_end_matches(".git")
        .to_string();
    let raw_url = format!(
        "https://raw.githubusercontent.com/{}/main/{}",
        entry.source, entry.skill_path
    );

    // Read local content
    let local_content = {
        // Find the local skill file by scanning agent dirs for this skill name
        let home = dirs::home_dir()
            .ok_or_else(|| AppError::Path("Cannot resolve home directory".into()))?;
        let agents_skills_dir = home.join(".agents").join("skills").join(&skill_name);
        let skill_file = agents_skills_dir.join("SKILL.md");
        if skill_file.exists() {
            std::fs::read_to_string(&skill_file)?
        } else {
            // Try disabled variant
            let disabled = agents_skills_dir.join("SKILL.md.disabled");
            if disabled.exists() {
                std::fs::read_to_string(&disabled)?
            } else {
                String::new()
            }
        }
    };

    // Fetch remote content
    let remote_content = reqwest::get(&raw_url)
        .await
        .map_err(|e| AppError::CliError(format!("Failed to fetch remote skill: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to read remote skill: {e}")))?;

    // Drop source_url to avoid unused variable warning
    let _ = source_url;

    Ok(SkillDiff {
        skill_name,
        local_content,
        remote_content,
    })
}
