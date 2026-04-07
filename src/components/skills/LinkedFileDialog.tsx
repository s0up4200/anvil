import { useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { readRelativeMd } from "@/lib/tauri"
import { getErrorMessage } from "@/lib/utils"

interface LinkedFileDialogProps {
  skillPath: string
  relativeLink: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LinkedFileDialog({
  skillPath,
  relativeLink,
  open,
  onOpenChange,
}: LinkedFileDialogProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !relativeLink) {
      setContent(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    readRelativeMd({ skillPath, relativeLink })
      .then((md) => {
        if (!cancelled) setContent(md)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, skillPath, relativeLink])

  const title = relativeLink
    ? relativeLink.split("/").pop()?.replace(/\.md$/, "") ?? relativeLink
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          {loading && (
            <p className="text-sm text-muted-foreground animate-pulse p-4">
              Loading…
            </p>
          )}
          {error && <p className="text-sm text-destructive p-4">{error}</p>}
          {!loading && !error && content != null && (
            <div className="prose dark:prose-invert prose-sm max-w-none p-4">
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
              >
                {content}
              </Markdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
