use base64::{engine::general_purpose::STANDARD, Engine as _};
use tauri::AppHandle;

use crate::error::AppError;
use crate::models::{AgentInstalls, LeaderboardSkill, LockfileEntry, MarketplaceSkill, SkillAudit, SkillDiff, SkillMetadata, SkillUpdate};
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
            if trimmed.starts_with('↑') {
                let name = trimmed.trim_start_matches('↑').trim();
                if !name.is_empty() {
                    let entry = lock.skills.get(name);
                    updates.push(SkillUpdate {
                        skill_name: name.to_string(),
                        local_hash: entry.map_or(String::new(), |e| e.skill_folder_hash.clone()),
                        source_repo: entry.map_or(String::new(), |e| e.source.clone()),
                        installed_at: entry.map_or(String::new(), |e| e.installed_at.clone()),
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

    let entries = tree_resp["tree"]
        .as_array()
        .ok_or_else(|| AppError::CliError("Missing tree array in response".into()))?;

    // Fast path: directory name matches skill name
    let suffix = format!("{skill}/SKILL.md");
    let skill_path = entries
        .iter()
        .find_map(|e| {
            let path = e["path"].as_str()?;
            if path.ends_with(&suffix) {
                Some(path.to_string())
            } else {
                None
            }
        });

    // Fallback: skill name differs from directory name (e.g. frontmatter name has org prefix).
    // Fetch SKILL.md blobs one at a time and match by frontmatter `name` field.
    let skill_path = match skill_path {
        Some(p) => p,
        None => {
            let candidates = entries.iter().filter_map(|e| {
                let path = e["path"].as_str()?;
                let blob_sha = e["sha"].as_str()?;
                if path.ends_with("/SKILL.md") {
                    Some((path, blob_sha))
                } else {
                    None
                }
            });

            let mut matched = None;
            for (path, blob_sha) in candidates {
                let url = format!(
                    "https://api.github.com/repos/{owner_repo}/git/blobs/{blob_sha}"
                );
                let ok = client
                    .get(&url)
                    .header("User-Agent", "anvil")
                    .send()
                    .await
                    .ok();
                let body = match ok {
                    Some(r) => r.text().await.ok(),
                    None => None,
                };

                if let Some(name) = body.as_deref().and_then(extract_frontmatter_name_from_blob) {
                    if name == skill {
                        matched = Some(path.to_string());
                        break;
                    }
                }
            }

            matched.ok_or_else(|| {
                AppError::NotFound(format!(
                    "SKILL.md not found for '{skill}' in {owner_repo}"
                ))
            })?
        }
    };

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

#[tauri::command]
pub async fn fetch_skill_metadata(source: String, skill: String) -> Result<SkillMetadata, AppError> {
    let url = format!("https://skills.sh/{source}/{skill}");

    let body = reqwest::Client::new()
        .get(&url)
        .header("User-Agent", "anvil")
        .header("rsc", "1")
        .header("next-url", format!("/{source}/{skill}"))
        .send()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to fetch skill page: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::CliError(format!("Failed to read skill page: {e}")))?;

    // Extract summary HTML from dangerouslySetInnerHTML
    // Iterate all occurrences — skip SVG icons, find the one with <p> content
    let summary_html = {
        let marker = r#""dangerouslySetInnerHTML":{"__html":""#;
        let bytes = body.as_bytes();
        let mut search_from = 0;
        let mut found = None;
        while let Some(pos) = body[search_from..].find(marker) {
            let content_start = search_from + pos + marker.len();
            let mut i = content_start;
            while i < bytes.len() {
                if bytes[i] == b'"' && bytes[i - 1] != b'\\' {
                    let html = body[content_start..i]
                        .replace(r#"\""#, "\"")
                        .replace(r#"\n"#, "\n");
                    if html.contains("<p>") && html.len() > 50 {
                        found = Some(html);
                    }
                    break;
                }
                i += 1;
            }
            if found.is_some() {
                break;
            }
            search_from = content_start;
        }
        found
    };

    // Helper: find text children after a label in RSC
    fn find_value_after(body: &str, label: &str) -> Option<String> {
        let idx = body.find(label)?;
        // Look for "children":"<value>" pattern after the label
        let rest = &body[idx..];
        let marker = r#""children":""#;
        // Skip the label's own children, find the next value div
        let mut search_from = 0;
        // Find the closing of the label element, then the next children
        for _ in 0..3 {
            if let Some(pos) = rest[search_from..].find(marker) {
                let val_start = search_from + pos + marker.len();
                if let Some(end) = rest[val_start..].find('"') {
                    let val = &rest[val_start..val_start + end];
                    if val != label && !val.is_empty() && !val.contains("className") {
                        return Some(val.to_string());
                    }
                }
                search_from = search_from + pos + marker.len();
            } else {
                break;
            }
        }
        None
    }

    let weekly_installs = find_value_after(&body, "Weekly Installs");
    let github_stars = find_value_after(&body, "Github Stars")
        .or_else(|| find_value_after(&body, "GitHub Stars"));
    let first_seen = find_value_after(&body, "First Seen");

    // Extract security audits — find "Security Audits" section, then parse name/status pairs
    let audits = {
        let mut result = Vec::new();
        if let Some(section_start) = body.find("Security Audits") {
            let section = &body[section_start..body.len().min(section_start + 2000)];
            let audit_names = [
                ("Gen Agent Trust Hub", "agent-trust-hub"),
                ("Socket", "socket"),
                ("Snyk", "snyk"),
            ];
            for (name, slug) in &audit_names {
                if let Some(name_idx) = section.find(name) {
                    let after = &section[name_idx..section.len().min(name_idx + 300)];
                    let status = if after.contains("Pass") || after.contains("PASS") {
                        "PASS"
                    } else if after.contains("Warn") || after.contains("WARN") {
                        "WARN"
                    } else if after.contains("Fail") || after.contains("FAIL") {
                        "FAIL"
                    } else {
                        continue;
                    };
                    result.push(SkillAudit {
                        name: name.to_string(),
                        status: status.to_string(),
                        url: format!("https://skills.sh/{source}/{skill}/security/{slug}"),
                    });
                }
            }
        }
        result
    };

    // Extract "Installed on" agent breakdown
    let installed_on = {
        let mut result = Vec::new();
        if let Some(section_start) = body.find("Installed on") {
            let section = &body[section_start..];
            // Pattern: ["$","div","<agent>",{...children:[span agent, span count]}]
            // We look for: ,"<agent>",{"className":"flex items-center justify-between
            let div_marker = r#"["$","div",""#;
            let children_marker = r#""children":""#;
            let mut search = 0;
            while let Some(pos) = section[search..].find(div_marker) {
                let key_start = search + pos + div_marker.len();
                if let Some(key_end) = section[key_start..].find('"') {
                    let agent = &section[key_start..key_start + key_end];
                    // Skip structural divs
                    if agent.is_empty() || agent.contains("className") {
                        search = key_start;
                        continue;
                    }
                    // Find the count value — second "children":"..." after the agent name
                    let after_agent = &section[key_start..];
                    let mut child_search = 0;
                    let mut found_name = false;
                    for _ in 0..5 {
                        if let Some(cp) = after_agent[child_search..].find(children_marker) {
                            let val_start = child_search + cp + children_marker.len();
                            if let Some(val_end) = after_agent[val_start..].find('"') {
                                let val = &after_agent[val_start..val_start + val_end];
                                if val == agent {
                                    found_name = true;
                                    child_search = val_start;
                                    continue;
                                }
                                if found_name && !val.is_empty() {
                                    result.push(AgentInstalls {
                                        agent: agent.to_string(),
                                        count: val.to_string(),
                                    });
                                    break;
                                }
                            }
                            child_search = child_search + cp + children_marker.len();
                        } else {
                            break;
                        }
                    }
                }
                search = key_start;
            }
        }
        result
    };

    Ok(SkillMetadata {
        summary_html,
        weekly_installs,
        github_stars,
        first_seen,
        audits,
        installed_on,
    })
}

/// Extract the `name` field from YAML frontmatter in a GitHub blob API response.
/// The blob content is base64-encoded JSON: `{"content": "<base64>", ...}`.
fn extract_frontmatter_name_from_blob(blob_json: &str) -> Option<String> {
    let parsed: serde_json::Value = serde_json::from_str(blob_json).ok()?;
    let encoded = parsed["content"].as_str()?;
    // GitHub returns base64 with newlines — strip them before decoding
    let clean: String = encoded.chars().filter(|c| !c.is_whitespace()).collect();
    let bytes = STANDARD.decode(&clean).ok()?;
    let text = String::from_utf8(bytes).ok()?;

    // Parse frontmatter: text between first two "---" lines
    let trimmed = text.strip_prefix("---")?;
    let end = trimmed.find("\n---")?;
    let frontmatter = &trimmed[..end];

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            let val = val.trim().trim_matches('"').trim_matches('\'');
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
    }
    None
}
