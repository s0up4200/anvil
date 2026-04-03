import { invoke } from "@tauri-apps/api/core";
import type {
  Agent,
  Skill,
  SkillFrontmatter,
  AppConfig,
  MarketplaceSkill,
  SkillUpdate,
  SkillDiff,
  LockfileEntry,
} from "@/types";

// ---------------------------------------------------------------------------
// Agent commands
// ---------------------------------------------------------------------------

/** Detect all known agents and whether their skills directories exist. */
export function detectAgents(): Promise<Agent[]> {
  return invoke<Agent[]>("detect_agents");
}

// ---------------------------------------------------------------------------
// Skill commands
// ---------------------------------------------------------------------------

/** Scan all known agents and return the full deduplicated skill list. */
export function scanAllSkills(): Promise<Skill[]> {
  return invoke<Skill[]>("scan_all_skills");
}

/** Read and parse a single skill file. Returns [frontmatter, body]. */
export function getSkill(path: string): Promise<[SkillFrontmatter, string]> {
  return invoke<[SkillFrontmatter, string]>("get_skill", { path });
}

/**
 * Create a new skill directory + SKILL.md inside agentPath.
 * Returns the path of the created SKILL.md.
 */
export function createSkill(params: {
  name: string;
  description: string;
  body: string;
  agentPath: string;
  scope: string;
}): Promise<string> {
  return invoke<string>("create_skill", params);
}

/**
 * Overwrite a skill file with new frontmatter + body.
 * frontmatter is serialized to JSON string before sending.
 */
export function updateSkill(params: {
  path: string;
  frontmatter: string;
  body: string;
}): Promise<void> {
  return invoke<void>("update_skill", params);
}

/** Move a skill (and its directory) to the OS trash. */
export function deleteSkill(path: string): Promise<void> {
  return invoke<void>("delete_skill", { path });
}

/**
 * Duplicate a skill into a sibling directory with a -copy suffix.
 * Returns the path of the new SKILL.md.
 */
export function duplicateSkill(path: string): Promise<string> {
  return invoke<string>("duplicate_skill", { path });
}

/**
 * Enable or disable a skill by renaming SKILL.md ↔ SKILL.md.disabled.
 * Returns the new file path after rename.
 */
export function toggleSkill(path: string, enabled: boolean): Promise<string> {
  return invoke<string>("toggle_skill", { path, enabled });
}

/**
 * Install a skill to another agent via symlink or copy.
 * method: "symlink" | "copy"
 */
export function installSkillToAgent(params: {
  sourcePath: string;
  targetDir: string;
  method: "symlink" | "copy";
}): Promise<void> {
  return invoke<void>("install_skill_to_agent", params);
}

// ---------------------------------------------------------------------------
// File watcher commands
// ---------------------------------------------------------------------------

/** Start watching the given paths for SKILL.md changes. */
export function startFileWatcher(paths: string[]): Promise<void> {
  return invoke<void>("start_file_watcher", { paths });
}

// ---------------------------------------------------------------------------
// Config commands
// ---------------------------------------------------------------------------

/** Read application config from disk. Returns defaults when file not found. */
export function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>("get_config");
}

/** Persist application config to disk. */
export function saveConfig(config: AppConfig): Promise<void> {
  return invoke<void>("save_config", { config });
}

// ---------------------------------------------------------------------------
// Marketplace commands
// ---------------------------------------------------------------------------

/** Search the skills.sh marketplace. */
export function searchMarketplace(query: string): Promise<MarketplaceSkill[]> {
  return invoke<MarketplaceSkill[]>("search_marketplace", { query });
}

/** Install a marketplace skill globally (vault + auto-symlink to all agents). */
export function installFromMarketplace(params: {
  package: string;
}): Promise<void> {
  return invoke<void>("install_from_marketplace", params);
}

/** Check for available skill updates. */
export function checkSkillUpdates(): Promise<SkillUpdate[]> {
  return invoke<SkillUpdate[]>("check_skill_updates");
}

/** Update a single marketplace skill. */
export function updateMarketplaceSkill(skillName: string): Promise<void> {
  return invoke<void>("update_marketplace_skill", { skillName });
}

/** Update all outdated marketplace skills. */
export function updateAllSkills(): Promise<void> {
  return invoke<void>("update_all_skills");
}

/** Read the skill lockfile entries. */
export function readSkillLockfile(): Promise<[string, LockfileEntry][]> {
  return invoke<[string, LockfileEntry][]>("read_skill_lockfile");
}

/** Fetch the full SKILL.md content for a marketplace skill from GitHub. */
export function fetchMarketplaceSkillContent(pkg: string): Promise<string> {
  return invoke<string>("fetch_marketplace_skill_content", { package: pkg });
}

/** Fetch the diff between local and remote versions of a skill. */
export function diffRemoteSkill(skillName: string): Promise<SkillDiff> {
  return invoke<SkillDiff>("diff_remote_skill", { skillName });
}
