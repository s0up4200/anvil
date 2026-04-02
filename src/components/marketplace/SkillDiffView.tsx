import { ScrollArea } from "@/components/ui/scroll-area"
import type { SkillDiff } from "@/types"

interface SkillDiffViewProps {
  diff: SkillDiff
  onClose: () => void
}

export function SkillDiffView({ diff, onClose }: SkillDiffViewProps) {
  const localLines = diff.localContent.split("\n")
  const remoteLines = diff.remoteContent.split("\n")
  const maxLines = Math.max(localLines.length, remoteLines.length)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Changes for &ldquo;{diff.skillName}&rdquo;
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-px rounded border border-border overflow-hidden">
        {/* Local */}
        <div className="flex flex-col">
          <div className="bg-surface px-2 py-1 text-xs font-medium text-muted-foreground border-b border-border">
            Local
          </div>
          <ScrollArea className="h-64">
            <pre className="p-2 text-xs font-mono leading-5">
              {Array.from({ length: maxLines }, (_, i) => {
                const local = localLines[i] ?? ""
                const remote = remoteLines[i] ?? ""
                const changed = local !== remote
                return (
                  <div
                    key={i}
                    className={changed ? "bg-destructive/10 text-foreground" : "text-muted-foreground"}
                  >
                    {local || " "}
                  </div>
                )
              })}
            </pre>
          </ScrollArea>
        </div>

        {/* Remote */}
        <div className="flex flex-col">
          <div className="bg-surface px-2 py-1 text-xs font-medium text-muted-foreground border-b border-border">
            Remote
          </div>
          <ScrollArea className="h-64">
            <pre className="p-2 text-xs font-mono leading-5">
              {Array.from({ length: maxLines }, (_, i) => {
                const local = localLines[i] ?? ""
                const remote = remoteLines[i] ?? ""
                const changed = local !== remote
                return (
                  <div
                    key={i}
                    className={changed ? "bg-accent/20 text-foreground" : "text-muted-foreground"}
                  >
                    {remote || " "}
                  </div>
                )
              })}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
