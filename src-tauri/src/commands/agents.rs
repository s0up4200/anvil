use serde::{Deserialize, Serialize};

use crate::commands::settings::load_config_from_disk;
use crate::models::agent::{agent_defs, is_agent_detected, resolve_skills_path, Agent};

/// An `Agent` augmented with a runtime `detected` flag indicating whether its
/// skills directory exists on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedAgent {
    #[serde(flatten)]
    pub agent: Agent,

    /// `true` when the agent's config directory exists on the filesystem.
    pub detected: bool,
}

/// Returns all known agents, each annotated with whether the agent is installed.
/// Only detected agents (plus custom agents) are typically shown in the UI.
#[tauri::command]
pub fn detect_agents() -> Result<Vec<DetectedAgent>, String> {
    let home = dirs::home_dir();

    let mut result: Vec<DetectedAgent> = agent_defs()
        .into_iter()
        .map(|def| {
            let detected = is_agent_detected(&def, home.as_ref());
            let skills_path = resolve_skills_path(&def, home.as_ref());
            let agent = Agent {
                id: def.id,
                name: def.name,
                skills_path,
                color: def.color,
            };
            DetectedAgent { agent, detected }
        })
        .collect();

    // Append custom agents from config
    let config = load_config_from_disk();
    for ca in config.custom_agents {
        let detected = ca.skills_path.exists();
        result.push(DetectedAgent {
            agent: Agent {
                id: ca.id,
                name: ca.name,
                skills_path: Some(ca.skills_path),
                color: None,
            },
            detected,
        });
    }

    Ok(result)
}
