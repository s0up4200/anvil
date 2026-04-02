import { useCallback, useEffect, useState } from "react"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FrontmatterForm } from "@/components/editor/FrontmatterForm"
import { SkillEditor } from "@/components/editor/SkillEditor"
import { useSkillStore } from "@/stores/skillStore"
import { getSkill, updateSkill } from "@/lib/tauri"
import type { SkillFrontmatter } from "@/types"

export function SkillDetail() {
  const { skills, selectedSkillId } = useSkillStore()

  const selectedSkill = skills.find((s) => s.id === selectedSkillId) ?? null

  const [frontmatter, setFrontmatter] = useState<SkillFrontmatter>({})
  const [body, setBody] = useState("")
  // Saved state for dirty tracking
  const [savedFrontmatter, setSavedFrontmatter] = useState<SkillFrontmatter>({})
  const [savedBody, setSavedBody] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch full content whenever selection changes
  useEffect(() => {
    if (!selectedSkill) {
      setFrontmatter({})
      setBody("")
      setSavedFrontmatter({})
      setSavedBody("")
      setError(null)
      return
    }

    getSkill(selectedSkill.path)
      .then(([fm, b]) => {
        setFrontmatter(fm)
        setBody(b)
        setSavedFrontmatter(fm)
        setSavedBody(b)
        setError(null)
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
  }, [selectedSkill?.path])

  const isDirty =
    JSON.stringify(frontmatter) !== JSON.stringify(savedFrontmatter) ||
    body !== savedBody

  const handleSave = useCallback(async () => {
    if (!selectedSkill || !isDirty) return

    setIsSaving(true)
    setError(null)

    try {
      await updateSkill({
        path: selectedSkill.path,
        frontmatter: JSON.stringify(frontmatter),
        body,
      })
      setSavedFrontmatter(frontmatter)
      setSavedBody(body)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }, [selectedSkill, frontmatter, body, isDirty])

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
        <p className="text-sm">Select a skill to edit</p>
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
            <span
              className="size-1.5 rounded-full bg-orange-400"
              title="Unsaved changes"
            />
          )}
        </div>
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
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Scrollable form + editor */}
      <div className="flex flex-1 flex-col overflow-auto">
        <FrontmatterForm
          name={selectedSkill.name}
          onNameChange={() => {
            /* name is read-only for existing skills */
          }}
          frontmatter={frontmatter}
          onFrontmatterChange={setFrontmatter}
          isNew={false}
        />

        <div className="mx-4 mb-2 border-t border-border" />

        <div className="flex-1 overflow-auto">
          <SkillEditor value={body} onChange={setBody} />
        </div>
      </div>
    </div>
  )
}
