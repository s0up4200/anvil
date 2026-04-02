use serde::{Deserialize, Serialize};

use crate::commands::settings::load_config_from_disk;
use crate::models::agent::{known_agents, Agent};

/// An `Agent` augmented with a runtime `detected` flag indicating whether its
/// skills directory exists on disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedAgent {
    #[serde(flatten)]
    pub agent: Agent,

    /// `true` when `skills_path` exists on the filesystem.
    pub detected: bool,
}

/// Returns all known agents, each annotated with whether its skills directory
/// currently exists on disk.  Undetected agents are included so the frontend
/// can display them in a grayed-out state.
#[tauri::command]
pub fn detect_agents() -> Result<Vec<DetectedAgent>, String> {
    let agents = known_agents();

    let mut result: Vec<DetectedAgent> = agents
        .into_iter()
        .map(|agent| {
            let detected = agent
                .skills_path
                .as_ref()
                .map(|p| p.exists())
                .unwrap_or(false);
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
            },
            detected,
        });
    }

    Ok(result)
}
