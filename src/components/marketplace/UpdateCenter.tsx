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
  const { pendingUpdates, isChecking, checkNow } = useUpdateChecker()
  const { updatingSkills, markUpdating, clearUpdating, removeUpdate } =
    useUpdateStore()

  const [isUpdatingAll, setIsUpdatingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeDiff, setActiveDiff] = useState<SkillDiff | null>(null)
  const [loadingDiff, setLoadingDiff] = useState<string | null>(null)

  async function handleUpdateOne(skillName: string) {
    markUpdating(skillName)
    setError(null)
    try {
      await updateMarketplaceSkill(skillName)
      removeUpdate(skillName)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      clearUpdating(skillName)
    }
  }

  async function handleUpdateAll() {
    setIsUpdatingAll(true)
    setError(null)
    try {
      await updateAllSkills()
      // Clear all pending updates after successful bulk update.
      useUpdateStore.getState().setPendingUpdates([])
    } catch (err) {
      setError(getErrorMessage(err))
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
      setError(getErrorMessage(err))
    } finally {
      setLoadingDiff(null)
    }
  }

  const anyUpdating = updatingSkills.length > 0 || isUpdatingAll

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-4">
          {error && (
            <div className="flex items-center gap-2">
              <p className="text-xs text-destructive">{error}</p>
              <Button variant="outline" size="xs" onClick={() => { setError(null); void checkNow() }}>
                Retry
              </Button>
            </div>
          )}

          {pendingUpdates.length === 0 && !isChecking && (
            <div className="flex flex-col gap-2 p-6">
              <p className="text-sm text-muted-foreground">
                All skills are up to date
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

          <ProgressLog
            eventName="marketplace-update-progress"
            isRunning={anyUpdating}
          />

          {activeDiff && (
            <SkillDiffView
              diff={activeDiff}
              onClose={() => setActiveDiff(null)}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
