import type { Skill } from "@/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SkillGroupEntry = {
  type: "group"
  groupName: string
  displayName: string
  skills: Skill[]
}

export type SkillStandaloneEntry = {
  type: "skill"
  skill: Skill
}

export type GroupedSkillItem = SkillGroupEntry | SkillStandaloneEntry

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "gsd" → "GSD", "superpowers" → "Superpowers", "plugin-dev" → "Plugin Dev" */
export function formatGroupName(name: string): string {
  return name
    .split("-")
    .map((seg) => (seg.length <= 3 ? seg.toUpperCase() : seg[0].toUpperCase() + seg.slice(1)))
    .join(" ")
}

// ---------------------------------------------------------------------------
// Grouping algorithm
// ---------------------------------------------------------------------------

/**
 * Groups a sorted list of skills by their `group` field (set by the scanner
 * when a skill lives in a nested directory like `superpowers/brainstorming/`).
 * Skills without a group are interleaved as standalone entries.
 */
export function groupSkills(skills: Skill[]): GroupedSkillItem[] {
  const groupMap = new Map<string, Skill[]>()
  const standalone: Skill[] = []

  for (const skill of skills) {
    if (skill.group) {
      const arr = groupMap.get(skill.group) ?? []
      arr.push(skill)
      groupMap.set(skill.group, arr)
    } else {
      standalone.push(skill)
    }
  }

  // Assemble into a sorted interleaved list.
  const entries: Array<{ sortKey: string; item: GroupedSkillItem }> = []

  for (const [groupName, groupSkills] of groupMap) {
    entries.push({
      sortKey: groupName,
      item: {
        type: "group",
        groupName,
        displayName: formatGroupName(groupName),
        skills: groupSkills,
      },
    })
  }

  for (const skill of standalone) {
    entries.push({
      sortKey: skill.name,
      item: { type: "skill", skill },
    })
  }

  entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { sensitivity: "base" }))

  return entries.map((e) => e.item)
}
