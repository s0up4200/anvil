import { useCallback, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { InstallDialog } from "@/components/skills/InstallDialog"
import { useSkillStore } from "@/stores/skillStore"
import { useUpdateStore } from "@/stores/updateStore"
import { useSkills } from "@/hooks/useSkills"
import { deleteSkill, duplicateSkill, getConfig, toggleSkill } from "@/lib/tauri"
import { getAgentColor, getAgentDisplayName } from "@/lib/constants"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Skill } from "@/types"

export function SkillList() {
  const { selectedSkillId, setSelectedSkillId, searchQuery, setSearchQuery, removeSkill, updateSkillInPlace } =
    useSkillStore()
  const { pendingUpdates } = useUpdateStore()
  const { skills, isLoading, error, refetch } = useSkills()

  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [installTarget, setInstallTarget] = useState<Skill | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null)

  function handleOpenInstall(skill: Skill) {
    setInstallTarget(skill)
    setInstallDialogOpen(true)
  }

  const doDelete = useCallback(async (skill: Skill) => {
    try {
      await deleteSkill(skill.path)
      removeSkill(skill.id)
    } catch (err) {
      console.error("Failed to delete skill:", err)
    }
  }, [removeSkill])

  async function handleDelete(skill: Skill) {
    const cfg = await getConfig().catch(() => null)
    if (cfg?.confirmBeforeDelete !== false) {
      setDeleteTarget(skill)
      setDeleteDialogOpen(true)
    } else {
      await doDelete(skill)
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
            className={cn("pl-7", searchQuery && "pr-7")}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" />
            </button>
          )}
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
          <div className="flex h-full flex-col gap-1 p-4">
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
              <ContextMenuTrigger>
                <button
                  type="button"
                  onClick={() => setSelectedSkillId(skill.id)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none",
                    selectedSkillId === skill.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                    !skill.isEnabled && "opacity-50"
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
                    <TooltipProvider delay={200}>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {skill.agentIds.map((agentId) => (
                          <Tooltip key={agentId}>
                            <TooltipTrigger>
                              <span
                                className="size-1.5 rounded-full block"
                                style={{ backgroundColor: getAgentColor(agentId) }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>{getAgentDisplayName(agentId)}</TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </TooltipProvider>
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
                <ContextMenuItem onClick={() => handleOpenInstall(skill)}>
                  Install to…
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

      <InstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        skill={installTarget}
        onInstalled={refetch}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This will move it to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) void doDelete(deleteTarget)
                setDeleteDialogOpen(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
