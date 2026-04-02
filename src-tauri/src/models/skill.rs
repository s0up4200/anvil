use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

/// Scope controls where a skill is visible/invocable.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillScope {
    Global,
    Project,
}

impl Default for SkillScope {
    fn default() -> Self {
        SkillScope::Global
    }
}

/// Where the canonical copy of the skill file lives.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SkillSource {
    /// File lives directly in an agent's skills directory.
    Native,
    /// File is a symlink pointing elsewhere.
    Symlink,
    /// File is inside the Skillforge-managed vault.
    Vault,
}

impl Default for SkillSource {
    fn default() -> Self {
        SkillSource::Native
    }
}

/// Parsed YAML frontmatter from a SKILL.md file.
///
/// Field names here match the YAML kebab-case keys (via `#[serde(rename = ...)]`).
/// All fields are optional because user-authored files may omit any of them.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillFrontmatter {
    #[serde(rename = "description", default, skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(rename = "user-invocable", default, skip_serializing_if = "Option::is_none")]
    pub user_invocable: Option<bool>,

    #[serde(rename = "argument-hint", default, skip_serializing_if = "Option::is_none")]
    pub argument_hint: Option<String>,

    #[serde(rename = "allowed-tools", default, skip_serializing_if = "Option::is_none")]
    pub allowed_tools: Option<Vec<String>>,

    /// Catch-all bucket for any other frontmatter keys we don't explicitly model.
    #[serde(flatten)]
    pub metadata: HashMap<String, serde_json::Value>,
}

/// A fully-resolved skill, ready to be sent to the frontend via Tauri IPC.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    /// Unique stable identifier — SHA-256 of the canonical file path.
    pub id: String,

    /// Skill name derived from the filename (without `.md` extension).
    pub name: String,

    /// Absolute path to the skill file on disk.
    pub path: PathBuf,

    /// Canonical (symlink-resolved) path used for deduplication.
    pub resolved_path: PathBuf,

    /// All agent IDs that reference this skill (merged when deduplicated).
    pub agent_ids: Vec<String>,

    /// Parsed frontmatter, if present.
    pub frontmatter: Option<SkillFrontmatter>,

    /// Raw markdown body (everything after the frontmatter delimiter).
    pub body: String,

    /// Full raw file content.
    pub raw: String,

    /// Scope of this skill.
    pub scope: SkillScope,

    /// Where this file lives.
    pub source: SkillSource,

    /// Whether the skill file is active (false when the file is `SKILL.md.disabled`).
    pub is_enabled: bool,

    /// Whether the skill is marked internal via frontmatter metadata.
    pub is_internal: bool,

    /// ISO-8601 timestamp of when the file was last modified.
    pub last_modified: String,

    /// File size in bytes.
    pub file_size: u64,

    /// Number of lines in the file.
    pub line_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Minimal YAML that omits optional fields — deserialisation must not fail.
    #[test]
    fn frontmatter_minimal_round_trip() {
        let yaml = "description: Does a thing\n";
        let fm: SkillFrontmatter = serde_norway::from_str(yaml).expect("deserialize");
        assert_eq!(fm.description.as_deref(), Some("Does a thing"));
        assert!(fm.user_invocable.is_none());
        assert!(fm.argument_hint.is_none());

        let out = serde_norway::to_string(&fm).expect("serialize");
        let fm2: SkillFrontmatter = serde_norway::from_str(&out).expect("re-deserialize");
        assert_eq!(fm.description, fm2.description);
    }

    /// Full frontmatter with all known fields.
    #[test]
    fn frontmatter_full_round_trip() {
        let yaml = "\
description: My skill
user-invocable: true
argument-hint: \"<query>\"
allowed-tools:
  - Bash
  - Read
";
        let fm: SkillFrontmatter = serde_norway::from_str(yaml).expect("deserialize");
        assert_eq!(fm.description.as_deref(), Some("My skill"));
        assert_eq!(fm.user_invocable, Some(true));
        assert_eq!(fm.argument_hint.as_deref(), Some("<query>"));
        assert_eq!(
            fm.allowed_tools.as_deref(),
            Some(&["Bash".to_string(), "Read".to_string()][..])
        );

        let out = serde_norway::to_string(&fm).expect("serialize");
        let fm2: SkillFrontmatter = serde_norway::from_str(&out).expect("re-deserialize");
        assert_eq!(fm.description, fm2.description);
        assert_eq!(fm.user_invocable, fm2.user_invocable);
        assert_eq!(fm.argument_hint, fm2.argument_hint);
        assert_eq!(fm.allowed_tools, fm2.allowed_tools);
    }

    /// Extra/unknown keys must land in `metadata` without errors.
    #[test]
    fn frontmatter_unknown_keys_go_to_metadata() {
        let yaml = "\
description: Test
custom-key: custom-value
";
        let fm: SkillFrontmatter = serde_norway::from_str(yaml).expect("deserialize");
        assert!(fm.metadata.contains_key("custom-key"));
    }

    /// Verify that `SkillScope` serialises to the expected camelCase strings.
    #[test]
    fn skill_scope_serialization() {
        let s = serde_json::to_string(&SkillScope::Global).unwrap();
        assert_eq!(s, r#""global""#);
        let s = serde_json::to_string(&SkillScope::Project).unwrap();
        assert_eq!(s, r#""project""#);
    }

    /// Verify that `SkillSource` serialises to the expected camelCase strings.
    #[test]
    fn skill_source_serialization() {
        let s = serde_json::to_string(&SkillSource::Symlink).unwrap();
        assert_eq!(s, r#""symlink""#);
    }
}
