import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { SkillRow } from "@/components/layout/SkillRow"
import { cn } from "@/lib/utils"
import type { Skill, SkillUpdate } from "@/types"

interface SkillGroupProps {
  groupName: string
  displayName: string
  skills: Skill[]
  selectedSkillId: string | null
  pendingUpdates: SkillUpdate[]
  defaultCollapsed: boolean
  onSelect: (id: string) => void
  onDelete: (skill: Skill) => void
  onDuplicate: (skill: Skill) => void
  onToggle: (skill: Skill) => void
  onInstall: (skill: Skill) => void
}

export function SkillGroup({
  displayName,
  skills,
  selectedSkillId,
  pendingUpdates,
  defaultCollapsed,
  onSelect,
  onDelete,
  onDuplicate,
  onToggle,
  onInstall,
}: SkillGroupProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  return (
    <div>
      {/* Group header */}
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
            !collapsed && "rotate-90",
          )}
        />
        <span className="flex-1 truncate text-[11px] font-medium uppercase tracking-widest text-muted-foreground font-heading">
          {displayName}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/60">
          {skills.length}
        </span>
      </button>

      {/* Collapsible content */}
      <div
        className="skill-group-content"
        data-collapsed={collapsed}
      >
        <div>
          {skills.map((skill) => (
            <SkillRow
              key={skill.id}
              skill={skill}
              isSelected={selectedSkillId === skill.id}
              pendingUpdates={pendingUpdates}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggle={onToggle}
              onInstall={onInstall}
              className="pl-7"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
