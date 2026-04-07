import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { computeDiffData, computeWordDiff } from "@/lib/diff-utils"
import type { DiffLine, WordSegment } from "@/lib/diff-utils"
import type { SkillDiff } from "@/types"

interface SkillDiffViewProps {
  diff: SkillDiff
  onClose: () => void
}

export function SkillDiffView({ diff, onClose }: SkillDiffViewProps) {
  const { lines, pairedLines, stats } = useMemo(
    () => computeDiffData(diff.localContent, diff.remoteContent),
    [diff.localContent, diff.remoteContent],
  )

  const hasChanges = stats.added > 0 || stats.removed > 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">
            {diff.skillName}
          </h3>
          {hasChanges && (
            <span className="text-xs font-mono text-muted-foreground">
              <span className="text-[var(--diff-added-fg)]">
                +{stats.added}
              </span>{" "}
              <span className="text-[var(--diff-removed-fg)]">
                &minus;{stats.removed}
              </span>
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {!hasChanges ? (
          <p className="p-4 text-xs text-muted-foreground">
            Files are identical
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-fit text-xs font-mono leading-5">
              {lines.map((line, i) => (
                <DiffRow
                  key={i}
                  line={line}
                  pairedLine={
                    pairedLines.has(i) ? lines[pairedLines.get(i)!] : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

const DIFF_STYLES = {
  added: {
    gutter: "+",
    rowBg: "bg-[var(--diff-added-bg)]",
    gutterColor: "text-[var(--diff-added-fg)]",
    contentColor: "text-foreground",
    wordHighlight: "bg-[var(--diff-added-word)] rounded-sm",
  },
  removed: {
    gutter: "-",
    rowBg: "bg-[var(--diff-removed-bg)]",
    gutterColor: "text-[var(--diff-removed-fg)]",
    contentColor: "text-foreground",
    wordHighlight: "bg-[var(--diff-removed-word)] rounded-sm",
  },
  unchanged: {
    gutter: " ",
    rowBg: "",
    gutterColor: "text-transparent",
    contentColor: "text-muted-foreground",
    wordHighlight: "",
  },
} as const

function DiffRow({
  line,
  pairedLine,
}: {
  line: DiffLine
  pairedLine?: DiffLine
}) {
  const style = DIFF_STYLES[line.type]

  // Word-level diff for paired changed lines
  const wordSegments = useMemo(() => {
    if (!pairedLine) return null
    if (line.type === "removed") {
      return computeWordDiff(line.content, pairedLine.content).oldSegments
    }
    if (line.type === "added") {
      return computeWordDiff(pairedLine.content, line.content).newSegments
    }
    return null
  }, [line.content, line.type, pairedLine?.content])

  return (
    <div
      className={`grid select-text ${style.rowBg}`}
      style={{ gridTemplateColumns: "3.5ch 3.5ch 1.5ch 1fr" }}
    >
      <span className="select-none pr-1 text-right text-muted-foreground/50">
        {line.oldLineNumber ?? ""}
      </span>
      <span className="select-none pr-1 text-right text-muted-foreground/50">
        {line.newLineNumber ?? ""}
      </span>
      <span className={`select-none text-center ${style.gutterColor}`}>
        {style.gutter}
      </span>
      <span className={`whitespace-pre pl-1 ${style.contentColor}`}>
        {wordSegments ? (
          <WordHighlight
            segments={wordSegments}
            highlightClass={style.wordHighlight}
          />
        ) : (
          (line.content || " ")
        )}
      </span>
    </div>
  )
}

function WordHighlight({
  segments,
  highlightClass,
}: {
  segments: WordSegment[]
  highlightClass: string
}) {
  return (
    <>
      {segments.map((seg, i) => (
        <span
          key={i}
          className={seg.type !== "unchanged" ? highlightClass : undefined}
        >
          {seg.text}
        </span>
      ))}
    </>
  )
}
