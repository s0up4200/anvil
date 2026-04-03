// Agent display helpers.
// Colors and names now come from the backend (agents.json → Rust → frontend).
// These helpers provide fallbacks for custom agents or missing data.

/** Fallback color for agents without a brand color. */
export const DEFAULT_AGENT_COLOR = "#6B7280";

/** Returns the brand color for an agent, falling back to gray. */
export function getAgentColor(agent: { color?: string }): string {
  return agent.color ?? DEFAULT_AGENT_COLOR;
}
