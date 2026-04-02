use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Represents a supported AI agent and the path where its skills live.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Agent {
    /// Short stable slug used as an identifier (e.g. `"claude-code"`).
    pub id: String,

    /// Human-readable display name.
    pub name: String,

    /// Absolute path to this agent's skills directory (expanded from `~`).
    /// `None` when the home directory cannot be resolved.
    pub skills_path: Option<PathBuf>,
}

/// Returns the list of all known agents with their resolved skills paths.
pub fn known_agents() -> Vec<Agent> {
    let home = dirs::home_dir();

    let raw: &[(&str, &str, &str)] = &[
        ("claude-code", "Claude Code", ".claude/skills"),
        ("codex", "Codex", ".codex/skills"),
        ("opencode", "OpenCode", ".config/opencode/skills"),
        ("gemini-cli", "Gemini CLI", ".gemini/skills"),
        ("windsurf", "Windsurf", ".windsurf/skills"),
        ("amp", "Amp", ".amp/skills"),
        ("vscode-copilot", "VS Code Copilot", ".github/skills"),
    ];

    raw.iter()
        .map(|(id, name, rel)| Agent {
            id: id.to_string(),
            name: name.to_string(),
            skills_path: home.as_ref().map(|h| h.join(rel)),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_agents_returns_all_seven() {
        let agents = known_agents();
        assert_eq!(agents.len(), 7);
    }

    #[test]
    fn known_agents_ids_are_unique() {
        let agents = known_agents();
        let mut ids: Vec<&str> = agents.iter().map(|a| a.id.as_str()).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), agents.len(), "agent IDs must be unique");
    }

    #[test]
    fn known_agents_paths_end_with_skills() {
        let agents = known_agents();
        for agent in &agents {
            if let Some(path) = &agent.skills_path {
                assert_eq!(
                    path.file_name().and_then(|n| n.to_str()),
                    Some("skills"),
                    "agent {} skills_path should end with 'skills'",
                    agent.id
                );
            }
        }
    }

    #[test]
    fn agent_serializes_to_camel_case() {
        let agent = Agent {
            id: "test-agent".to_string(),
            name: "Test Agent".to_string(),
            skills_path: Some(PathBuf::from("/home/user/.test/skills")),
        };
        let json = serde_json::to_value(&agent).unwrap();
        assert!(json.get("skillsPath").is_some(), "expected camelCase 'skillsPath'");
        assert!(json.get("skills_path").is_none(), "snake_case key should not appear");
    }
}
