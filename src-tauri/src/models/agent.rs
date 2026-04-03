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

    /// Brand color hex string (e.g. `"#D97757"`), if known.
    pub color: Option<String>,
}

/// Raw agent definition deserialized from the embedded `agents.json`.
#[derive(Debug, Deserialize)]
pub struct AgentDef {
    pub id: String,
    pub name: String,
    /// Skills directory relative to `$HOME`.
    pub skills_path: String,
    /// Directories relative to `$HOME` to probe for detection (any match → detected).
    pub detect_paths: Vec<String>,
    /// Optional env var whose value overrides the home-relative base for detection.
    #[serde(default)]
    pub detect_env: Option<String>,
    /// Brand color hex string.
    #[serde(default)]
    pub color: Option<String>,
}

/// Parses the embedded agent registry.
pub fn agent_defs() -> Vec<AgentDef> {
    serde_json::from_str(include_str!("../data/agents.json"))
        .expect("data/agents.json must be valid")
}

/// Returns the list of all known agents with their resolved skills paths.
pub fn known_agents() -> Vec<Agent> {
    let home = dirs::home_dir();

    agent_defs()
        .into_iter()
        .map(|def| {
            let skills_path = resolve_skills_path(&def, home.as_ref());
            Agent {
                id: def.id,
                name: def.name,
                skills_path,
                color: def.color,
            }
        })
        .collect()
}

/// Resolves the absolute skills path for an agent definition.
/// Respects `detect_env` when it points to an overridden base directory.
pub fn resolve_skills_path(def: &AgentDef, home: Option<&PathBuf>) -> Option<PathBuf> {
    // If the agent has an env var override, check it first.
    if let Some(env_key) = &def.detect_env {
        if let Ok(val) = std::env::var(env_key) {
            let val = val.trim().to_string();
            if !val.is_empty() {
                // The env var points to the agent's config root.
                // Append "skills" since skills_path is like ".claude/skills" —
                // we only need the final "skills" segment.
                return Some(PathBuf::from(val).join("skills"));
            }
        }
    }
    home.map(|h| h.join(&def.skills_path))
}

/// Checks whether the agent described by `def` is installed on this machine.
pub fn is_agent_detected(def: &AgentDef, home: Option<&PathBuf>) -> bool {
    // Check env var override first.
    if let Some(env_key) = &def.detect_env {
        if let Ok(val) = std::env::var(env_key) {
            let val = val.trim().to_string();
            if !val.is_empty() {
                return PathBuf::from(val).exists();
            }
        }
    }

    // Fall back to probing detect_paths relative to home.
    let Some(home) = home else { return false };
    def.detect_paths.iter().any(|rel| home.join(rel).exists())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn agent_defs_parse_correctly() {
        let defs = agent_defs();
        assert!(defs.len() > 30, "expected 30+ agents, got {}", defs.len());
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
            color: Some("#FF0000".to_string()),
        };
        let json = serde_json::to_value(&agent).unwrap();
        assert!(json.get("skillsPath").is_some(), "expected camelCase 'skillsPath'");
        assert!(json.get("skills_path").is_none(), "snake_case key should not appear");
        assert!(json.get("color").is_some(), "color should be present");
    }

    #[test]
    fn all_defs_have_at_least_one_detect_path() {
        for def in agent_defs() {
            assert!(
                !def.detect_paths.is_empty(),
                "agent {} must have at least one detect_path",
                def.id
            );
        }
    }
}
