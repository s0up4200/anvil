use tauri::AppHandle;

use crate::error::AppError;
use crate::models::{LeaderboardSkill, LockfileEntry, MarketplaceSkill, SkillDiff, SkillUpdate};
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
pub async fn fetch_marketplace_skill_content(package: String) -> Result<String, AppError> {
    let (owner_repo, skill) = package
        .rsplit_once('@')
        .ok_or_else(|| AppError::CliError("Invalid package format, expected owner/repo@skill".into()))?;

    let owner_repo = owner_repo.to_string();
    let skill = skill.to_string();

    // Fetch the repo tree to find the SKILL.md path
    let tree_url = format!(
        "https://api.github.com/repos/{owner_repo}/git/trees/HEAD?recursive=1"
    );

    let client = reqwest::Client::new();
    let tree_text = client
        .get(&tree_url)
        .header("User-Agent", "anvil")
        .send()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to fetch repo tree: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to read tree response: {e}")))?;

    let tree_resp: serde_json::Value = serde_json::from_str(&tree_text)
        .map_err(|e| AppError::CliError(format!("Failed to parse tree JSON: {e}")))?;

    let sha = tree_resp["sha"]
        .as_str()
        .ok_or_else(|| AppError::CliError("Missing tree SHA in response".into()))?
        .to_string();

    let suffix = format!("{skill}/SKILL.md");
    let entries = tree_resp["tree"]
        .as_array()
        .ok_or_else(|| AppError::CliError("Missing tree array in response".into()))?;

    let skill_path = entries
        .iter()
        .find_map(|e| {
            let path = e["path"].as_str()?;
            if path.ends_with(&suffix) {
                Some(path.to_string())
            } else {
                None
            }
        })
        .ok_or_else(|| {
            AppError::NotFound(format!("SKILL.md not found for '{skill}' in {owner_repo}"))
        })?;

    // Fetch raw content using the tree SHA as ref
    let raw_url = format!(
        "https://raw.githubusercontent.com/{owner_repo}/{sha}/{skill_path}"
    );

    let content = client
        .get(&raw_url)
        .header("User-Agent", "anvil")
        .send()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to fetch skill content: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to read skill content: {e}")))?;

    Ok(content)
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

#[tauri::command]
pub async fn fetch_leaderboard(tab: String) -> Result<Vec<LeaderboardSkill>, AppError> {
    let path = match tab.as_str() {
        "trending" => "/trending",
        "hot" => "/hot",
        _ => "/",
    };

    let url = format!("https://skills.sh{path}");

    let client = reqwest::Client::new();
    let body = client
        .get(&url)
        .header("User-Agent", "anvil")
        .header("rsc", "1")
        .header("next-router-prefetch", "1")
        .header("next-url", path)
        .header(
            "next-router-segment-prefetch",
            if path == "/" {
                "/!KGhvbWUp/__PAGE__".to_string()
            } else {
                format!("/!KGhvbWUp{path}/__PAGE__")
            },
        )
        .send()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to fetch leaderboard: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to read leaderboard response: {e}")))?;

    // Extract the initialSkills JSON array from the RSC payload
    let marker = "\"initialSkills\":";
    let start = body
        .find(marker)
        .ok_or_else(|| AppError::CliError("Leaderboard data not found in response".into()))?
        + marker.len();

    // Find the matching closing bracket
    let bytes = body.as_bytes();
    let mut depth = 0i32;
    let mut end = start;
    for (i, &b) in bytes[start..].iter().enumerate() {
        match b {
            b'[' => depth += 1,
            b']' => {
                depth -= 1;
                if depth == 0 {
                    end = start + i + 1;
                    break;
                }
            }
            _ => {}
        }
    }

    if depth != 0 {
        return Err(AppError::CliError(
            "Failed to parse leaderboard JSON array".into(),
        ));
    }

    let json_str = &body[start..end];

    #[derive(serde::Deserialize)]
    struct RawSkill {
        source: String,
        name: String,
        installs: u64,
    }

    let raw: Vec<RawSkill> = serde_json::from_str(json_str)
        .map_err(|e| AppError::CliError(format!("Failed to parse leaderboard skills: {e}")))?;

    let skills = raw
        .into_iter()
        .enumerate()
        .map(|(i, s)| LeaderboardSkill {
            rank: i + 1,
            name: s.name,
            source: s.source,
            installs: s.installs,
        })
        .collect();

    Ok(skills)
}
