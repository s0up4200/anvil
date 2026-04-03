import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import type { SkillFrontmatter } from "@/types"

// Simple slug validator: lowercase letters, digits, hyphens only.
const SLUG_RE = /^[a-z0-9-]*$/

interface FrontmatterFormProps {
  name: string
  onNameChange: (value: string) => void
  frontmatter: SkillFrontmatter
  onFrontmatterChange: (updated: SkillFrontmatter) => void
  /** Whether this is a new skill (name is editable) */
  isNew?: boolean
}

export function FrontmatterForm({
  name,
  onNameChange,
  frontmatter,
  onFrontmatterChange,
  isNew = false,
}: FrontmatterFormProps) {
  const description = frontmatter.description ?? ""
  const userInvocable = frontmatter.userInvocable ?? false
  const argumentHint = frontmatter.argumentHint ?? ""

  const isNameInvalid = name.length > 0 && !SLUG_RE.test(name)

  function update(patch: Partial<SkillFrontmatter>) {
    onFrontmatterChange({ ...frontmatter, ...patch })
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Name */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Name
        </label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="skill-name"
          disabled={!isNew}
          aria-invalid={isNameInvalid}
          className={cn(!isNew && "cursor-default opacity-70")}
        />
        {isNameInvalid && (
          <p className="text-xs text-destructive">
            Only lowercase letters, digits, and hyphens are allowed.
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Description
          </label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {description.length}
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What does this skill do?"
          rows={3}
        />
      </div>

      {/* User-invocable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">User-invocable</span>
          <span className="text-xs text-muted-foreground">
            Can be triggered directly by the user via a slash command.
          </span>
        </div>
        <Toggle
          variant="outline"
          pressed={userInvocable}
          onPressedChange={(pressed) => update({ userInvocable: pressed })}
          aria-label="Toggle user-invocable"
        >
          {userInvocable ? "On" : "Off"}
        </Toggle>
      </div>

      {/* Argument hint — shown when user-invocable is on */}
      {userInvocable && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Argument hint
          </label>
          <Input
            value={argumentHint}
            onChange={(e) => update({ argumentHint: e.target.value })}
            placeholder="e.g. <path-to-file>"
          />
          <p className="text-xs text-muted-foreground">
            Shown to the user as a hint when invoking the skill.
          </p>
        </div>
      )}
    </div>
  )
}
