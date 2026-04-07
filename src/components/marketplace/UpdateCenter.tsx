import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUpdateChecker } from "@/hooks/useUpdateChecker"
import { useUpdateStore } from "@/stores/updateStore"
import {
  updateMarketplaceSkill,
  updateAllSkills,
  diffRemoteSkill,
} from "@/lib/tauri"
import { ProgressLog } from "./ProgressLog"
import { SkillDiffView } from "./SkillDiffView"
import { getErrorMessage } from "@/lib/utils"
import type { SkillDiff } from "@/types"

export function UpdateCenter() {
  const { pendingUpdates, skippedSkills, isChecking, checkError, checkNow } = useUpdateChecker()
  const { updatingSkills, markUpdating, clearUpdating, removeUpdate } =
    useUpdateStore()

  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeDiff, setActiveDiff] = useState<SkillDiff | null>(null)
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null)

  async function handleUpdateOne(skillName: string) {
    markUpdating(skillName)
    setActionError(null)
    try {
      await updateMarketplaceSkill(skillName)
      removeUpdate(skillName)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      clearUpdating(skillName)
    }
  }

  async function handleUpdateAll() {
    setIsUpdatingAll(true)
    setActionError(null)
    try {
      await updateAllSkills()
      // Clear all pending updates after successful bulk update.
      useUpdateStore.getState().setPendingUpdates([])
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setIsUpdatingAll(false)
    }
  }

  async function handleViewDiff(skillName: string) {
    setLoadingDiff(skillName)
    try {
      const diff = await diffRemoteSkill(skillName)
      setActiveDiff(diff)
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setLoadingDiff(null)
    }
  }

  const anyUpdating = updatingSkills.length > 0 || isUpdatingAll

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-foreground">Updates</h2>
          {pendingUpdates.length > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              {pendingUpdates.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkNow}
            disabled={isChecking}
          >
            {isChecking ? "Checking…" : "Check Now"}
          </Button>
          {pendingUpdates.length > 0 && (
            <Button
              size="sm"
              onClick={() => void handleUpdateAll()}
              disabled={anyUpdating}
            >
              {isUpdatingAll ? "Updating…" : "Update All"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeDiff ? (
        <SkillDiffView
          diff={activeDiff}
          onClose={() => setActiveDiff(null)}
        />
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 p-4">
            {checkError && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive">{checkError}</p>
                <Button variant="outline" size="xs" onClick={() => void checkNow()}>
                  Retry
                </Button>
              </div>
            )}

            {actionError && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive">{actionError}</p>
                <Button variant="outline" size="xs" onClick={() => setActionError(null)}>
                  Dismiss
                </Button>
              </div>
            )}

            {skippedSkills.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-medium text-amber-200">
                  Some marketplace skills could not be checked
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {skippedSkills.map((skill) => (
                    <p key={skill.skillName} className="text-xs text-amber-100/90">
                      {skill.skillName}
                      {skill.sourceRepo ? ` (${skill.sourceRepo})` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {pendingUpdates.length === 0 && skippedSkills.length === 0 && !isChecking && !checkError && (
              <div className="flex flex-col gap-2 p-6">
                <p className="text-sm text-muted-foreground">
                  All skills are up to date
                </p>
              </div>
            )}

            {pendingUpdates.length === 0 && skippedSkills.length > 0 && !isChecking && !checkError && (
              <div className="flex flex-col gap-2 p-6 pt-2">
                <p className="text-sm text-muted-foreground">
                  No updates found for the skills that were checked
                </p>
              </div>
            )}

            {isChecking && pendingUpdates.length === 0 && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Checking for updates…
              </p>
            )}

            {pendingUpdates.map((update) => {
              const isUpdating = updatingSkills.includes(update.skillName)
              return (
                <div
                  key={update.skillName}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {update.skillName}
                    </p>
                    {update.sourceRepo && (
                      <p className="text-xs text-muted-foreground">
                        {update.sourceRepo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleViewDiff(update.skillName)}
                      disabled={loadingDiff === update.skillName}
                    >
                      {loadingDiff === update.skillName ? "Loading…" : "Diff"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleUpdateOne(update.skillName)}
                      disabled={isUpdating || isUpdatingAll}
                    >
                      {isUpdating ? "Updating…" : "Update"}
                    </Button>
                  </div>
                </div>
              )
            })}

            {anyUpdating && updatingSkills.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Fetching latest version of {updatingSkills.length === 1 ? updatingSkills[0] : `${updatingSkills.length} skills`}…
              </p>
            )}
            <ProgressLog
              eventName="marketplace-update-progress"
              isRunning={anyUpdating}
            />
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
