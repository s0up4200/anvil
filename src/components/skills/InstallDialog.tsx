import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAgentStore } from "@/stores/agentStore"
import { installSkillToAgent } from "@/lib/tauri"
import { getAgentDisplayName } from "@/lib/constants"
import type { Skill } from "@/types"

interface InstallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: Skill | null
  onInstalled?: () => void
}

type InstallMethod = "symlink" | "copy"

export function InstallDialog({
  open,
  onOpenChange,
  skill,
  onInstalled,
}: InstallDialogProps) {
  const { agents } = useAgentStore()

  // Agents that are detected, have a path, and don't already have this skill.
  const targetAgents = agents.filter(
    (a) =>
      a.detected &&
      a.skillsPath != null &&
      skill != null &&
      !skill.agentIds.includes(a.id)
  )

  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())
  const [method, setMethod] = useState<InstallMethod>("symlink")
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setSelectedAgentIds(new Set())
    setMethod("symlink")
    setIsInstalling(false)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function toggleAgent(agentId: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  async function handleInstall() {
    if (!skill || selectedAgentIds.size === 0) return
    setIsInstalling(true)
    setError(null)

    try {
      const targets = agents.filter(
        (a) => selectedAgentIds.has(a.id) && a.skillsPath != null
      )
      await Promise.all(
        targets.map((agent) =>
          installSkillToAgent({
            sourcePath: skill.resolvedPath,
            targetDir: agent.skillsPath!,
            method,
          })
        )
      )
      reset()
      onOpenChange(false)
      onInstalled?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setIsInstalling(false)
    }
  }

  const canInstall = selectedAgentIds.size > 0 && !isInstalling

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>
            Install &ldquo;{skill?.name ?? "Skill"}&rdquo; to Agent
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {targetAgents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Already installed on all detected agents.
            </p>
          ) : (
            <>
              {/* Agent checkboxes */}
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground">Target Agents</p>
                <div className="flex flex-col gap-1.5">
                  {targetAgents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgentIds.has(agent.id)}
                        onChange={() => toggleAgent(agent.id)}
                        className="h-4 w-4 rounded border-input accent-foreground"
                      />
                      <span>{getAgentDisplayName(agent.id)}</span>
                      {agent.skillsPath && (
                        <span className="truncate text-xs text-muted-foreground">
                          {agent.skillsPath}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Install method */}
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-foreground">Install Method</p>
                <div className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="install-method"
                      value="symlink"
                      checked={method === "symlink"}
                      onChange={() => setMethod("symlink")}
                      className="accent-foreground"
                    />
                    <span>Symlink <span className="text-xs text-muted-foreground">(recommended)</span></span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="install-method"
                      value="copy"
                      checked={method === "copy"}
                      onChange={() => setMethod("copy")}
                      className="accent-foreground"
                    />
                    <span>Copy</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton>
          {targetAgents.length > 0 && (
            <Button
              onClick={() => void handleInstall()}
              disabled={!canInstall}
            >
              {isInstalling ? "Installing…" : "Install"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
