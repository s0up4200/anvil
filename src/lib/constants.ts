// Agent IDs, display names, and brand colors.

export const AGENT_IDS = [
  "claude-code",
  "codex",
  "opencode",
  "gemini-cli",
  "windsurf",
  "amp",
  "vscode-copilot",
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENT_DISPLAY_NAMES: Record<AgentId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  "gemini-cli": "Gemini CLI",
  windsurf: "Windsurf",
  amp: "Amp",
  "vscode-copilot": "VS Code Copilot",
};

export const AGENT_COLORS: Record<AgentId, string> = {
  "claude-code": "#D97757",
  codex: "#10A37F",
  opencode: "#6366F1",
  "gemini-cli": "#4285F4",
  windsurf: "#00D1B2",
  amp: "#FF6B35",
  "vscode-copilot": "#1F6FEB",
};

/** Fallback color for unknown or custom agents. */
export const DEFAULT_AGENT_COLOR = "#6B7280";

/** Returns the brand color for an agent ID, falling back to the default. */
export function getAgentColor(agentId: string): string {
  return AGENT_COLORS[agentId as AgentId] ?? DEFAULT_AGENT_COLOR;
}

/** Returns the display name for an agent ID, falling back to the raw ID. */
export function getAgentDisplayName(agentId: string): string {
  return AGENT_DISPLAY_NAMES[agentId as AgentId] ?? agentId;
}
