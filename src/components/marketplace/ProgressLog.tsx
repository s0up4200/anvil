import { useEffect, useRef, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ProgressLogProps {
  eventName: string
  isRunning: boolean
}

export function ProgressLog({ eventName, isRunning }: ProgressLogProps) {
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isRunning) return

    setLines([])
    const unlisten = listen<string>(eventName, (event) => {
      setLines((prev) => [...prev, event.payload])
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [eventName, isRunning])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [lines])

  if (lines.length === 0 && !isRunning) return null

  return (
    <ScrollArea className="h-40 rounded border border-border bg-surface p-2">
      <pre className="text-[13px] font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        {isRunning && (
          <div className="text-foreground animate-pulse">...</div>
        )}
        <div ref={bottomRef} />
      </pre>
    </ScrollArea>
  )
}
