use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarketplaceSkill {
    pub package: String,
    pub name: String,
    pub source: String,
    pub description: String,
    pub install_count: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillUpdate {
    pub skill_name: String,
    pub local_hash: String,
    pub source_repo: String,
    pub installed_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedSkill {
    pub skill_name: String,
    pub source_repo: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillCheckResult {
    pub updates: Vec<SkillUpdate>,
    pub skipped_skills: Vec<SkippedSkill>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDiff {
    pub skill_name: String,
    pub local_content: String,
    pub remote_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardSkill {
    pub rank: usize,
    pub name: String,
    pub source: String,
    pub installs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillMetadata {
    pub summary_html: Option<String>,
    pub weekly_installs: Option<String>,
    pub github_stars: Option<String>,
    pub first_seen: Option<String>,
    pub audits: Vec<SkillAudit>,
    pub installed_on: Vec<AgentInstalls>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstalls {
    pub agent: String,
    pub count: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAudit {
    pub name: String,
    pub status: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockfileEntry {
    pub source: String,
    #[serde(default)]
    pub source_type: String,
    #[serde(default)]
    pub source_url: String,
    #[serde(default)]
    pub skill_path: String,
    #[serde(default)]
    pub skill_folder_hash: String,
    #[serde(default)]
    pub installed_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lockfile {
    pub version: u32,
    #[serde(default)]
    pub skills: HashMap<String, LockfileEntry>,
}
