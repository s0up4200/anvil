import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAgentStore } from "@/stores/agentStore"
import { createSkill } from "@/lib/tauri"
import { getAgentDisplayName } from "@/lib/constants"
import { getErrorMessage } from "@/lib/utils"

interface CreateSkillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

export function CreateSkillDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateSkillDialogProps) {
  const { agents } = useAgentStore()
  const detectedAgents = agents.filter((a) => a.detected && a.skillsPath)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    detectedAgents[0]?.id ?? ""
  )
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const slug = name.trim().toLowerCase().replace(/\s+/g, "-")
  const isSlugValid = slug === "" || SLUG_RE.test(slug)
  const selectedAgent = detectedAgents.find((a) => a.id === selectedAgentId)
  const canCreate =
    slug.length > 0 && isSlugValid && selectedAgent?.skillsPath != null

  function reset() {
    setName("")
    setDescription("")
    setSelectedAgentId(detectedAgents[0]?.id ?? "")
    setError(null)
    setIsCreating(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleCreate() {
    if (!canCreate || !selectedAgent?.skillsPath) return
    setIsCreating(true)
    setError(null)
    try {
      await createSkill({
        name: slug,
        description: description.trim(),
        body: "",
        agentPath: selectedAgent.skillsPath,
        scope: "global",
      })
      reset()
      onOpenChange(false)
      onCreated?.()
    } catch (err) {
      setError(getErrorMessage(err))
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton>
        <DialogHeader>
          <DialogTitle>New Skill</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="skill-name">
              Name
            </label>
            <Input
              id="skill-name"
              placeholder="my-skill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={name.trim() !== "" && !isSlugValid}
            />
            {name.trim() !== "" && (
              <p className="text-xs text-muted-foreground">
                Slug:{" "}
                <span className={isSlugValid ? "text-foreground" : "text-destructive"}>
                  {slug || "(empty)"}
                </span>
              </p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="skill-desc">
              Description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="skill-desc"
              rows={3}
              placeholder="What does this skill do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          {/* Agent selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="skill-agent">
              Agent
            </label>
            {detectedAgents.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No agents detected. Install an agent first.
              </p>
            ) : (
              <select
                id="skill-agent"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                {detectedAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {getAgentDisplayName(agent.id)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter showCloseButton>
          <Button
            onClick={() => void handleCreate()}
            disabled={!canCreate || isCreating}
          >
            {isCreating ? "Creating…" : "Create Skill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
