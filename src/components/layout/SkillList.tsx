import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
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
import { SkillRow } from "@/components/layout/SkillRow"
import { SkillGroup } from "@/components/layout/SkillGroup"
import { groupSkills } from "@/lib/skill-grouping"
import { useSkillStore } from "@/stores/skillStore"
import { useAgentStore } from "@/stores/agentStore"
import { useUpdateStore } from "@/stores/updateStore"
import { useSkills } from "@/hooks/useSkills"
import { deleteSkill, duplicateSkill, getConfig, removeMarketplaceSkill, toggleSkill } from "@/lib/tauri"
import {
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { Skill } from "@/types"

export function SkillList() {
  const { selectedSkillId, setSelectedSkillId, searchQuery, setSearchQuery, removeSkill, updateSkillInPlace, pendingDeleteId, setPendingDeleteId } =
    useSkillStore()
  const { selectedAgentId, agents } = useAgentStore()
  const { pendingUpdates } = useUpdateStore()
  const { skills, isLoading, error, refetch } = useSkills()

  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [installTarget, setInstallTarget] = useState<Skill | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null)

  // React to keyboard-triggered delete requests
  useEffect(() => {
    if (!pendingDeleteId) return
    const skill = skills.find((s) => s.id === pendingDeleteId)
    setPendingDeleteId(null)
    if (skill) handleDelete(skill)
  }, [pendingDeleteId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group skills when not searching
  const grouped = useMemo(
    () => (searchQuery.trim() ? null : groupSkills(skills)),
    [skills, searchQuery],
  )

  const groupCount = grouped?.filter((e) => e.type === "group").length ?? 0
  const defaultCollapsed = groupCount > 4

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

  const doRemoveFromAgent = useCallback(async (skill: Skill, agentId: string) => {
    try {
      await removeMarketplaceSkill(skill.name, agentId)
      removeSkill(skill.id)
    } catch (err) {
      console.error("Failed to remove skill from agent:", err)
    }
  }, [removeSkill])

  const doRemoveEverywhere = useCallback(async (skill: Skill) => {
    try {
      await removeMarketplaceSkill(skill.name)
      removeSkill(skill.id)
    } catch (err) {
      console.error("Failed to remove skill:", err)
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
    } catch (err) {
      console.error("Failed to duplicate skill:", err)
    }
  }

  async function handleToggle(skill: Skill) {
    try {
      const newPath = await toggleSkill(skill.path, !skill.isEnabled)
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

        <TooltipProvider delay={200}>
          {!isLoading && grouped
            ? /* Grouped view */
              grouped.map((entry) =>
                entry.type === "group" ? (
                  <SkillGroup
                    key={entry.groupName}
                    groupName={entry.groupName}
                    displayName={entry.displayName}
                    skills={entry.skills}
                    selectedSkillId={selectedSkillId}
                    pendingUpdates={pendingUpdates}
                    defaultCollapsed={defaultCollapsed}
                    onSelect={setSelectedSkillId}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onToggle={handleToggle}
                    onInstall={handleOpenInstall}
                  />
                ) : (
                  <SkillRow
                    key={entry.skill.id}
                    skill={entry.skill}
                    isSelected={selectedSkillId === entry.skill.id}
                    pendingUpdates={pendingUpdates}
                    onSelect={setSelectedSkillId}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onToggle={handleToggle}
                    onInstall={handleOpenInstall}
                  />
                ),
              )
            : /* Flat search results */
              !isLoading &&
              skills.map((skill) => (
                <SkillRow
                  key={skill.id}
                  skill={skill}
                  isSelected={selectedSkillId === skill.id}
                  pendingUpdates={pendingUpdates}
                  onSelect={setSelectedSkillId}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onToggle={handleToggle}
                  onInstall={handleOpenInstall}
                />
              ))}
        </TooltipProvider>
      </div>

      <InstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        skill={installTarget}
        onInstalled={refetch}
      />

      <DeleteSkillDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        skill={deleteTarget}
        selectedAgentId={selectedAgentId}
        agentName={
          selectedAgentId
            ? agents.find((a) => a.id === selectedAgentId)?.name ?? selectedAgentId
            : undefined
        }
        onDelete={doDelete}
        onRemoveFromAgent={doRemoveFromAgent}
        onRemoveEverywhere={doRemoveEverywhere}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------

interface DeleteSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: Skill | null
  selectedAgentId: string | null
  agentName: string | undefined
  onDelete: (skill: Skill) => void
  onRemoveFromAgent: (skill: Skill, agentId: string) => void
  onRemoveEverywhere: (skill: Skill) => void
}

function DeleteSkillDialog({
  open,
  onOpenChange,
  skill,
  selectedAgentId,
  agentName,
  onDelete,
  onRemoveFromAgent,
  onRemoveEverywhere,
}: DeleteSkillDialogProps) {
  const isMultiAgent = skill !== null && skill.agentIds.length > 1 && selectedAgentId !== null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete skill</AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiAgent
              ? <>
                  &ldquo;{skill.name}&rdquo; is installed in {skill.agentIds.length} agents.
                  Remove it from {agentName} only, or delete it everywhere?
                </>
              : <>Are you sure you want to delete &ldquo;{skill?.name}&rdquo;? This will move it to the trash.</>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {isMultiAgent ? (
            <>
              <AlertDialogAction
                variant="outline"
                onClick={() => {
                  void onRemoveFromAgent(skill, selectedAgentId)
                  onOpenChange(false)
                }}
              >
                Remove from {agentName}
              </AlertDialogAction>
              <AlertDialogAction
                onClick={() => {
                  void onRemoveEverywhere(skill)
                  onOpenChange(false)
                }}
              >
                Delete everywhere
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction
              onClick={() => {
                if (skill) void onDelete(skill)
                onOpenChange(false)
              }}
            >
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
