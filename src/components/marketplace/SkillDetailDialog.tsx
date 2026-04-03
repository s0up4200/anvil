import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { fetchMarketplaceSkillContent, fetchSkillMetadata } from "@/lib/tauri"
import { getErrorMessage } from "@/lib/utils"
import type { MarketplaceSkill, SkillMetadata } from "@/types"

const labelClass =
  "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"

const AUDIT_STATUS_COLORS: Record<string, string> = {
  PASS: "text-status-pass border-status-pass/10 bg-status-pass/10",
  WARN: "text-status-warn border-status-warn/10 bg-status-warn/10",
  FAIL: "text-status-fail border-status-fail/10 bg-status-fail/10",
}

function auditBadgeClass(status: string): string {
  const color = AUDIT_STATUS_COLORS[status] ?? AUDIT_STATUS_COLORS.FAIL
  return `${color} text-[10px] w-14 justify-center px-1.5 py-0`
}

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
  const [metadata, setMetadata] = useState<SkillMetadata | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !skill) {
      setContent(null)
      setMetadata(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // Fetch SKILL.md content and skills.sh metadata in parallel
    const contentPromise = fetchMarketplaceSkillContent(skill.package)
    const metadataPromise = fetchSkillMetadata(skill.source, skill.name).catch(() => null)

    Promise.all([contentPromise, metadataPromise])
      .then(([md, meta]) => {
        if (cancelled) return
        setContent(md)
        setMetadata(meta)
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

  const repoUrl = skill ? `https://github.com/${skill.source}` : ""

  function handleInstall() {
    if (!skill) return
    onOpenChange(false)
    onInstall(skill)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[min(90vw,72rem)] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{skill?.name ?? "Skill"}</DialogTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {skill?.source}
            </a>
            <span>&middot;</span>
            <span>{skill?.installCount}</span>
          </div>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 gap-4">
          {/* Main content */}
          <div className="flex-1 min-w-0 overflow-auto p-4">
            {loading && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Loading...
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {!loading && !error && content != null && (
              <div className="space-y-4">
                {/* Summary */}
                {metadata?.summaryHtml && (
                  <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                    <p className={`${labelClass} mb-2`}>Summary</p>
                    <div
                      className="prose dark:prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                      dangerouslySetInnerHTML={{ __html: metadata.summaryHtml }}
                    />
                  </div>
                )}

                {/* SKILL.md */}
                <div className="prose dark:prose-invert prose-sm max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content.replace(/^---\n[\s\S]*?\n---\n*/, "")}
                  </Markdown>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {!loading && metadata && (
            <div className="hidden sm:flex w-48 shrink-0 flex-col text-sm">
              <div className="flex-1 min-h-0 overflow-auto pr-3 flex flex-col gap-4">
              {metadata.weeklyInstalls && (
                <div>
                  <p className={`${labelClass} mb-1`}>Weekly Installs</p>
                  <p className="text-lg font-semibold tabular-nums">{metadata.weeklyInstalls}</p>
                </div>
              )}

              <div>
                <p className={`${labelClass} mb-1`}>Repository</p>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-foreground hover:underline"
                >
                  {skill?.source}
                </a>
              </div>

              {skill?.url && (
                <div>
                  <p className={`${labelClass} mb-1`}>Skill Page</p>
                  <a
                    href={skill.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground hover:underline"
                  >
                    skills.sh
                  </a>
                </div>
              )}

              {metadata.githubStars && (
                <div>
                  <p className={`${labelClass} mb-1`}>GitHub Stars</p>
                  <p className="text-xs tabular-nums">{metadata.githubStars}</p>
                </div>
              )}

              {metadata.firstSeen && (
                <div>
                  <p className={`${labelClass} mb-1`}>First Seen</p>
                  <p className="text-xs">{metadata.firstSeen}</p>
                </div>
              )}

              {metadata.audits.length > 0 && (
                <div>
                  <p className={`${labelClass} mb-1.5`}>Security Audits</p>
                  <div className="flex flex-col gap-1">
                    {metadata.audits.map((audit) => (
                      <div key={audit.name} className="flex items-center justify-between gap-2">
                        <a
                          href={audit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-foreground hover:underline"
                        >
                          {audit.name}
                        </a>
                        <Badge
                          variant="outline"
                          className={auditBadgeClass(audit.status)}
                        >
                          {audit.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metadata.installedOn.length > 0 && (
                <div>
                  <p className={`${labelClass} mb-1.5`}>Installed On</p>
                  <div className="flex flex-col divide-y divide-border">
                    {metadata.installedOn.map((entry) => (
                      <div key={entry.agent} className="flex items-center justify-between py-1">
                        <span className="text-xs">{entry.agent}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{entry.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>

              <div className="shrink-0 pt-4 pr-3">
                <Button onClick={handleInstall} className="w-full">Install</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
