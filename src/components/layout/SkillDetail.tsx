import { useCallback, useEffect, useState } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FrontmatterForm } from "@/components/editor/FrontmatterForm"
import { SkillEditor } from "@/components/editor/SkillEditor"
import { useSkillStore } from "@/stores/skillStore"
import { useUIStore } from "@/stores/uiStore"
import { getSkill, updateSkill } from "@/lib/tauri"
import { getErrorMessage, resolveTheme } from "@/lib/utils"
import type { SkillFrontmatter } from "@/types"

export function SkillDetail() {
  const { skills, selectedSkillId } = useSkillStore()
  const storeTheme = useUIStore((s) => s.theme)

  const resolvedTheme = resolveTheme(storeTheme)

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null

  const [frontmatter, setFrontmatter] = useState<SkillFrontmatter>({})
  const [body, setBody] = useState("")
  // Saved state for dirty tracking
  const [savedFrontmatter, setSavedFrontmatter] = useState<SkillFrontmatter>({})
  const [savedBody, setSavedBody] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"preview" | "edit">("preview")

  // Fetch full content whenever selection changes
  useEffect(() => {
    if (!selectedSkill) {
      setFrontmatter({})
      setBody("")
      setSavedFrontmatter({})
      setSavedBody("")
      setError(null)
      setMode("preview")
      return
    }

    setMode("preview")
    getSkill(selectedSkill.path)
      .then(([fm, b]) => {
        setFrontmatter(fm)
        setBody(b)
        setSavedFrontmatter(fm)
        setSavedBody(b)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(getErrorMessage(err))
      })
  }, [selectedSkill?.path])

  const isDirty =
    JSON.stringify(frontmatter) !== JSON.stringify(savedFrontmatter) ||
    body !== savedBody

  const handleDiscard = useCallback(() => {
    setFrontmatter(savedFrontmatter)
    setBody(savedBody)
  }, [savedFrontmatter, savedBody])

  const handleSave = useCallback(async () => {
    if (!selectedSkill || !isDirty) return

    setIsSaving(true)
    setError(null)

    const start = Date.now()
    try {
      await updateSkill({
        path: selectedSkill.path,
        frontmatter: JSON.stringify(frontmatter),
        body,
      })
      setSavedFrontmatter(frontmatter)
      setSavedBody(body)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      // Keep the saving indicator visible for at least 300ms to avoid a flash
      const remaining = 300 - (Date.now() - start)
      if (remaining > 0) {
        setTimeout(() => setIsSaving(false), remaining)
      } else {
        setIsSaving(false)
      }
    }
  }, [selectedSkill, frontmatter, body, isDirty])

  // Warn before closing window with unsaved changes
  useEffect(() => {
    if (!isDirty) return
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  // Cmd+S shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleSave])

  if (!selectedSkill) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background text-muted-foreground">
        <p className="text-sm">Select a skill to view</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{selectedSkill.name}</span>
          {isDirty && (
            <>
              <span
                className="size-1.5 rounded-full bg-status-pending"
                title="Unsaved changes"
              />
              <span className="sr-only">Unsaved changes</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {mode === "preview" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode("edit")}
              className="gap-1.5"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          ) : (
            <>
              {isDirty && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDiscard}
                  className="gap-1.5 text-muted-foreground"
                >
                  Discard
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                disabled={!isDirty || isSaving}
                onClick={() => void handleSave()}
                className="gap-1.5"
              >
                <Save className="size-3.5" />
                {isSaving ? "Saving…" : "Save"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (isDirty) handleDiscard()
                  setMode("preview")
                }}
                className="gap-1.5 text-muted-foreground"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex shrink-0 items-center justify-between bg-destructive/10 px-4 py-2">
          <span className="text-xs text-destructive">{error}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => void handleSave()}
            className="text-destructive hover:text-destructive"
          >
            Retry
          </Button>
        </div>
      )}

      {mode === "preview" ? (
        /* Rendered markdown preview */
        <div className="flex-1 overflow-auto p-4">
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
          </div>
        </div>
      ) : (
        /* Editable form + code editor */
        <div className="flex flex-1 flex-col overflow-auto">
          <FrontmatterForm
            name={selectedSkill.name}
            onNameChange={() => {}}
            frontmatter={frontmatter}
            onFrontmatterChange={setFrontmatter}
            isNew={false}
          />

          <div className="mx-4 mb-2 border-t border-border" />

          <div className="flex-1 overflow-auto">
            <SkillEditor value={body} onChange={setBody} theme={resolvedTheme} />
          </div>
        </div>
      )}
    </div>
  )
}
