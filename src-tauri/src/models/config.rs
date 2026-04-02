use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// A user-defined agent entry that supplements the built-in `known_agents()` list.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomAgent {
    /// Unique slug for this custom agent.
    pub id: String,

    /// Display name shown in the UI.
    pub name: String,

    /// Absolute path to the skills directory for this agent.
    pub skills_path: PathBuf,
}

/// Application-level configuration persisted to disk.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    /// Additional user-defined agents beyond the built-in list.
    #[serde(default)]
    pub custom_agents: Vec<CustomAgent>,

    /// Whether to follow symlinks when scanning skill directories.
    #[serde(default = "default_true")]
    pub follow_symlinks: bool,

    /// Path to the Skillforge-managed vault directory.
    /// Defaults to `~/.skillforge/vault` when `None`.
    #[serde(default)]
    pub vault_path: Option<PathBuf>,

    /// Whether to show hidden files (names starting with `.`) in skill lists.
    #[serde(default)]
    pub show_hidden: bool,

    /// UI theme preference: "dark", "light", or "system".
    #[serde(default = "default_theme")]
    pub theme: String,

    /// Default scope for new skills: "global" or "project".
    #[serde(default = "default_scope")]
    pub default_scope: String,

    /// Whether to show a confirmation dialog before deleting a skill.
    #[serde(default = "default_true")]
    pub confirm_before_delete: bool,
}

fn default_scope() -> String {
    "global".to_string()
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_true() -> bool {
    true
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            custom_agents: Vec::new(),
            follow_symlinks: true,
            vault_path: None,
            show_hidden: false,
            theme: default_theme(),
            default_scope: default_scope(),
            confirm_before_delete: true,
        }
    }
}

impl AppConfig {
    /// Resolved vault path: uses `vault_path` if set, otherwise `~/.skillforge/vault`.
    pub fn resolved_vault_path(&self) -> Option<PathBuf> {
        self.vault_path
            .clone()
            .or_else(|| dirs::home_dir().map(|h| h.join(".skillforge").join("vault")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_config_defaults() {
        let cfg = AppConfig::default();
        assert!(cfg.custom_agents.is_empty());
        assert!(cfg.follow_symlinks);
        assert!(!cfg.show_hidden);
        assert!(cfg.vault_path.is_none());
        assert_eq!(cfg.theme, "system");
        assert_eq!(cfg.default_scope, "global");
        assert!(cfg.confirm_before_delete);
    }

    #[test]
    fn app_config_round_trip_json() {
        let cfg = AppConfig {
            custom_agents: vec![CustomAgent {
                id: "my-agent".to_string(),
                name: "My Agent".to_string(),
                skills_path: PathBuf::from("/custom/path/skills"),
            }],
            follow_symlinks: false,
            vault_path: Some(PathBuf::from("/my/vault")),
            show_hidden: true,
            theme: "dark".to_string(),
            default_scope: "project".to_string(),
            confirm_before_delete: false,
        };

        let json = serde_json::to_string(&cfg).expect("serialize");
        let cfg2: AppConfig = serde_json::from_str(&json).expect("deserialize");

        assert_eq!(cfg.follow_symlinks, cfg2.follow_symlinks);
        assert_eq!(cfg.show_hidden, cfg2.show_hidden);
        assert_eq!(cfg.vault_path, cfg2.vault_path);
        assert_eq!(cfg.theme, cfg2.theme);
        assert_eq!(cfg.default_scope, cfg2.default_scope);
        assert_eq!(cfg.confirm_before_delete, cfg2.confirm_before_delete);
        assert_eq!(cfg.custom_agents.len(), cfg2.custom_agents.len());
        assert_eq!(cfg.custom_agents[0].id, cfg2.custom_agents[0].id);
    }

    #[test]
    fn app_config_camel_case_keys() {
        let cfg = AppConfig {
            follow_symlinks: false,
            show_hidden: true,
            theme: "dark".to_string(),
            ..Default::default()
        };
        let json = serde_json::to_value(&cfg).unwrap();
        assert!(json.get("followSymlinks").is_some());
        assert!(json.get("showHidden").is_some());
        assert!(json.get("follow_symlinks").is_none());
    }

    #[test]
    fn resolved_vault_path_uses_explicit_when_set() {
        let cfg = AppConfig {
            vault_path: Some(PathBuf::from("/explicit/vault")),
            ..Default::default()
        };
        assert_eq!(cfg.resolved_vault_path(), Some(PathBuf::from("/explicit/vault")));
    }

    #[test]
    fn resolved_vault_path_falls_back_to_home() {
        let cfg = AppConfig::default();
        let resolved = cfg.resolved_vault_path();
        if let Some(p) = resolved {
            assert!(p.ends_with(".skillforge/vault"));
        }
        // If home_dir() returns None in CI, just skip the assertion.
    }
}
