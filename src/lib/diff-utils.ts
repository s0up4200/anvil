import { diffLines, diffWords } from "diff"
import type { Change } from "diff"

export interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  oldLineNumber: number | null
  newLineNumber: number | null
}

export interface WordSegment {
  text: string
  type: "added" | "removed" | "unchanged"
}

export interface DiffStats {
  added: number
  removed: number
}

export interface DiffData {
  lines: DiffLine[]
  pairedLines: Map<number, number>
  stats: DiffStats
}

/**
 * Compute a unified diff as a flat array of lines with line numbers.
 */
export function computeUnifiedDiff(
  oldText: string,
  newText: string,
): DiffLine[] {
  const changes: Change[] = diffLines(oldText, newText, {
    stripTrailingCr: true,
  })
  const lines: DiffLine[] = []
  let oldLine = 1
  let newLine = 1

  for (const change of changes) {
    // Split into individual lines, drop trailing empty string from final newline
    const raw = change.value.split("\n")
    if (raw.at(-1) === "") raw.pop()

    const type: DiffLine["type"] = change.added
      ? "added"
      : change.removed
        ? "removed"
        : "unchanged"

    for (const text of raw) {
      lines.push({
        type,
        content: text,
        oldLineNumber: type !== "added" ? oldLine++ : null,
        newLineNumber: type !== "removed" ? newLine++ : null,
      })
    }
  }

  return lines
}

/**
 * Compute word-level diff between two lines. Returns segments for both
 * the old (removed) and new (added) line renderings.
 */
export function computeWordDiff(
  oldLine: string,
  newLine: string,
): { oldSegments: WordSegment[]; newSegments: WordSegment[] } {
  const changes: Change[] = diffWords(oldLine, newLine)
  const oldSegments: WordSegment[] = []
  const newSegments: WordSegment[] = []

  for (const change of changes) {
    if (change.added) {
      newSegments.push({ text: change.value, type: "added" })
    } else if (change.removed) {
      oldSegments.push({ text: change.value, type: "removed" })
    } else {
      oldSegments.push({ text: change.value, type: "unchanged" })
      newSegments.push({ text: change.value, type: "unchanged" })
    }
  }

  return { oldSegments, newSegments }
}

/**
 * Scan for adjacent removed+added blocks and pair them 1:1 by position
 * within the block. Returns map of removed-line-index → added-line-index.
 */
export function pairChangedLines(lines: DiffLine[]): Map<number, number> {
  const pairs = new Map<number, number>()
  let i = 0

  while (i < lines.length) {
    // Find start of a removed block
    if (lines[i].type !== "removed") {
      i++
      continue
    }

    const removedStart = i
    while (i < lines.length && lines[i].type === "removed") i++
    const removedEnd = i

    // Check if immediately followed by an added block
    if (i >= lines.length || lines[i].type !== "added") continue

    const addedStart = i
    while (i < lines.length && lines[i].type === "added") i++
    const addedEnd = i

    // Pair 1:1 up to the shorter block length
    const pairCount = Math.min(removedEnd - removedStart, addedEnd - addedStart)
    for (let j = 0; j < pairCount; j++) {
      pairs.set(removedStart + j, addedStart + j)
    }
  }

  return pairs
}

/**
 * All-in-one: compute lines, paired lines, and stats.
 */
export function computeDiffData(oldText: string, newText: string): DiffData {
  const lines = computeUnifiedDiff(oldText, newText)
  const pairedLines = pairChangedLines(lines)
  const stats: DiffStats = { added: 0, removed: 0 }
  for (const line of lines) {
    if (line.type === "added") stats.added++
    else if (line.type === "removed") stats.removed++
  }

  return { lines, pairedLines, stats }
}
