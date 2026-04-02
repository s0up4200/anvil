import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { useSkillStore } from "@/stores/skillStore"
import { useSkills } from "@/hooks/useSkills"
import { deleteSkill, duplicateSkill, toggleSkill } from "@/lib/tauri"
import { getAgentColor } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Skill } from "@/types"

export function SkillList() {
  const { selectedSkillId, setSelectedSkillId, searchQuery, setSearchQuery, removeSkill, updateSkillInPlace } =
    useSkillStore()
  const { skills, isLoading, error } = useSkills()

  async function handleDelete(skill: Skill) {
    try {
      await deleteSkill(skill.path)
      removeSkill(skill.id)
    } catch (err) {
      console.error("Failed to delete skill:", err)
    }
  }

  async function handleDuplicate(skill: Skill) {
    try {
      await duplicateSkill(skill.path)
      // The file watcher or a refetch will pick up the new skill.
    } catch (err) {
      console.error("Failed to duplicate skill:", err)
    }
  }

  async function handleToggle(skill: Skill) {
    try {
      const newPath = await toggleSkill(skill.path, !skill.isEnabled)
      // Optimistically update the skill in the store.
      updateSkillInPlace({
        ...skill,
        path: newPath,
        isEnabled: !skill.isEnabled,
      })
    } catch (err) {
      console.error("Failed to toggle skill:", err)
    }
  }

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background">
      {/* Search bar */}
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search skills…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7"
          />
        </div>
      </div>

      {/* Skill rows */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
            Loading skills…
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-destructive">{error}</div>
        )}

        {!isLoading && !error && skills.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-6 text-center">
            <p className="text-sm font-medium text-foreground">No skills found</p>
            <p className="text-xs text-muted-foreground">
              {searchQuery.trim()
                ? "Try a different search term."
                : "No skills are installed for the selected agent."}
            </p>
          </div>
        )}

        {!isLoading &&
          skills.map((skill) => (
            <ContextMenu key={skill.id}>
              <ContextMenuTrigger asChild>
                <button
                  type="button"
                  onClick={() => setSelectedSkillId(skill.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors",
                    selectedSkillId === skill.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                    !skill.isEnabled && "opacity-50"
                  )}
                >
                  {/* Name + agent dots */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {skill.name}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {skill.agentIds.map((agentId) => (
                        <span
                          key={agentId}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: getAgentColor(agentId) }}
                          title={agentId}
                        />
                      ))}
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
                <ContextMenuItem
                  onClick={() => setSelectedSkillId(skill.id)}
                >
                  Edit
                </ContextMenuItem>
                <ContextMenuItem onClick={() => void handleDuplicate(skill)}>
                  Duplicate
                </ContextMenuItem>
                <ContextMenuItem onClick={() => void handleToggle(skill)}>
                  {skill.isEnabled ? "Disable" : "Enable"}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => void handleDelete(skill)}
                >
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
      </div>
    </div>
  )
}
