import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { installFromMarketplace } from "@/lib/tauri"
import { ProgressLog } from "./ProgressLog"
import type { MarketplaceSkill } from "@/types"
import { getErrorMessage } from "@/lib/utils"

interface MarketplaceInstallDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  skill: MarketplaceSkill | null
  onInstalled?: () => void
}

export function MarketplaceInstallDialog({
  open,
  onOpenChange,
  skill,
  onInstalled,
}: MarketplaceInstallDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setIsInstalling(false)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next && !isInstalling) reset()
    onOpenChange(next)
  }

  async function handleInstall() {
    if (!skill) return
    setIsInstalling(true)
    setError(null)

    try {
      await installFromMarketplace({ package: skill.package })
      setIsInstalling(false)
      reset()
      onOpenChange(false)
      onInstalled?.()
    } catch (err) {
      setError(getErrorMessage(err))
      setIsInstalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>
            Install &ldquo;{skill?.name ?? "Skill"}&rdquo;
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            This will install the skill globally and symlink it to all detected agents.
          </p>

          <ProgressLog
            eventName="marketplace-install-progress"
            isRunning={isInstalling}
          />

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={() => void handleInstall()}
            disabled={isInstalling}
          >
            {isInstalling ? "Installing…" : "Install"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
