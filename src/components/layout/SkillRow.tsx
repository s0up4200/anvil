import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { DEFAULT_AGENT_COLOR } from "@/lib/constants"
import { useAgentStore } from "@/stores/agentStore"
import { cn } from "@/lib/utils"
import type { Skill, SkillUpdate } from "@/types"

interface SkillRowProps {
  skill: Skill
  isSelected: boolean
  pendingUpdates: SkillUpdate[]
  onSelect: (id: string) => void
  onDelete: (skill: Skill) => void
  onDuplicate: (skill: Skill) => void
  onToggle: (skill: Skill) => void
  onInstall: (skill: Skill) => void
  className?: string
}

export function SkillRow({
  skill,
  isSelected,
  pendingUpdates,
  onSelect,
  onDelete,
  onDuplicate,
  onToggle,
  onInstall,
  className,
}: SkillRowProps) {
  const agents = useAgentStore((s) => s.agents)
  const agentById = (id: string) => agents.find((a) => a.id === id)
  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <button
          type="button"
          onClick={() => onSelect(skill.id)}
          className={cn(
            "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none",
            isSelected
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted",
            !skill.isEnabled && "opacity-50",
            className,
          )}
        >
          {/* Name + update/agent dots */}
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 truncate text-sm font-medium" title={skill.name}>
              {skill.name}
              {pendingUpdates.some((u) => u.skillName === skill.name) && (
                <>
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-status-info"
                    title="Update available"
                  />
                  <span className="sr-only">Update available</span>
                </>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-0.5">
              {skill.agentIds.map((agentId) => {
                const agent = agentById(agentId)
                return (
                  <Tooltip key={agentId}>
                    <TooltipTrigger>
                      <span
                        className="size-1.5 rounded-full block"
                        style={{ backgroundColor: agent?.color ?? DEFAULT_AGENT_COLOR }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{agent?.name ?? agentId}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>

          {/* Description */}
          {skill.frontmatter?.description && (
            <p className="truncate text-xs text-muted-foreground">
              {skill.frontmatter.description}
            </p>
          )}

          {/* Enabled badge */}
          {!skill.isEnabled && (
            <Badge variant="outline" className="w-fit text-[10px]">
              disabled
            </Badge>
          )}
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={() => onSelect(skill.id)}>
          Edit
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onDuplicate(skill)}>
          Duplicate
        </ContextMenuItem>
        <ContextMenuItem onClick={() => void onToggle(skill)}>
          {skill.isEnabled ? "Disable" : "Enable"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onInstall(skill)}>
          Install to…
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          onClick={() => void onDelete(skill)}
        >
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
