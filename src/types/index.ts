// TypeScript interfaces mirroring Rust models.
// Field names match the camelCase serialization from the Rust backend.

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

/**
 * A fully-resolved agent as returned by `detect_agents`.
 * The Rust `DetectedAgent` flattens `Agent` + adds `detected`.
 */
export interface Agent {
  id: string;
  name: string;
  /** Absolute path to the agent's skills directory. Null when home dir cannot be resolved. */
  skillsPath: string | null;
  /** Whether the skills directory currently exists on disk. */
  detected: boolean;
}

// ---------------------------------------------------------------------------
// Skill
// ---------------------------------------------------------------------------

export type SkillScope = "global" | "project";
export type SkillSource = "native" | "symlink" | "vault";

/**
 * Parsed YAML frontmatter from a SKILL.md file.
 * All fields are optional because user-authored files may omit any of them.
 */
export interface SkillFrontmatter {
  description?: string;
  userInvocable?: boolean;
  argumentHint?: string;
  allowedTools?: string[];
  /** Catch-all for any other frontmatter keys. */
  [key: string]: unknown;
}

/**
 * A fully-resolved skill as returned by `scan_all_skills`.
 */
export interface Skill {
  id: string;
  name: string;
  /** Absolute path to the skill file on disk. */
  path: string;
  /** Canonical (symlink-resolved) path used for deduplication. */
  resolvedPath: string;
  /** All agent IDs that reference this skill. */
  agentIds: string[];
  /** Parsed frontmatter, if present. */
  frontmatter: SkillFrontmatter | null;
  /** Raw markdown body (everything after the frontmatter delimiter). */
  body: string;
  /** Full raw file content. */
  raw: string;
  scope: SkillScope;
  source: SkillSource;
  isEnabled: boolean;
  isInternal: boolean;
  /** ISO-8601 timestamp of last modification. */
  lastModified: string;
  fileSize: number;
  lineCount: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface CustomAgent {
  id: string;
  name: string;
  skillsPath: string;
}

export interface AppConfig {
  customAgents: CustomAgent[];
  followSymlinks: boolean;
  vaultPath: string | null;
  showHidden: boolean;
  theme: string;
  defaultScope: string;
  confirmBeforeDelete: boolean;
}

// ---------------------------------------------------------------------------
// File watcher event
// ---------------------------------------------------------------------------

export interface SkillChangeEvent {
  path: string;
  eventType: string;
}

// ---------------------------------------------------------------------------
// Marketplace (Phase 2)
// ---------------------------------------------------------------------------

export interface LeaderboardSkill {
  rank: number;
  name: string;
  source: string;
  installs: number;
}

export interface SkillMetadata {
  summaryHtml: string | null;
  weeklyInstalls: string | null;
  githubStars: string | null;
  firstSeen: string | null;
  audits: SkillAudit[];
  installedOn: AgentInstalls[];
}

export interface AgentInstalls {
  agent: string;
  count: string;
}

export interface SkillAudit {
  name: string;
  status: string;
}

export interface MarketplaceSkill {
  package: string;
  name: string;
  source: string;
  description: string;
  installCount: string;
  url: string;
}

export interface SkillUpdate {
  skillName: string;
  localHash: string;
  sourceRepo: string;
  installedAt: string;
}

export interface SkillDiff {
  skillName: string;
  localContent: string;
  remoteContent: string;
}

export interface LockfileEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath: string;
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}
