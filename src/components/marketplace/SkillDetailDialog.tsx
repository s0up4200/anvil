import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchMarketplaceSkillContent } from "@/lib/tauri"
import { getErrorMessage } from "@/lib/utils"
import type { MarketplaceSkill } from "@/types"

interface SkillDetailDialogProps {
  skill: MarketplaceSkill | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstall: (skill: MarketplaceSkill) => void
}

export function SkillDetailDialog({
  skill,
  open,
  onOpenChange,
  onInstall,
}: SkillDetailDialogProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !skill) {
      setContent(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetchMarketplaceSkillContent(skill.package)
      .then((md) => {
        if (!cancelled) setContent(md)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, skill])

  function handleInstall() {
    if (!skill) return
    onOpenChange(false)
    onInstall(skill)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(90vw,56rem)] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{skill?.name ?? "Skill"}</DialogTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{skill?.source}</span>
            <span>&middot;</span>
            <span>{skill?.installCount}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto rounded-md border border-border p-4">
          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading...
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {!loading && !error && content != null && (
            <div className="prose dark:prose-invert prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>
                {content.replace(/^---\n[\s\S]*?\n---\n*/, "")}
              </Markdown>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          {skill?.url ? (
            <a
              href={skill.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline self-center"
            >
              skills.sh
            </a>
          ) : (
            <span />
          )}
          <Button onClick={handleInstall}>Install</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
