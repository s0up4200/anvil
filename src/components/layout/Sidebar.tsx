import { Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAgentStore } from "@/stores/agentStore"
import { useSkillStore } from "@/stores/skillStore"
import { useUIStore } from "@/stores/uiStore"
import { getAgentColor, getAgentDisplayName } from "@/lib/constants"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const { agents, selectedAgentId, setSelectedAgentId } = useAgentStore()
  const { skills } = useSkillStore()
  const { setSettingsOpen } = useUIStore()

  const totalCount = skills.length

  function countForAgent(agentId: string): number {
    return skills.filter((s) => s.agentIds.includes(agentId)).length
  }

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Agent list */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {/* All Skills row */}
        <button
          type="button"
          onClick={() => setSelectedAgentId(null)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
            selectedAgentId === null
              ? "bg-accent text-accent-foreground font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          <span>All Skills</span>
          <Badge variant="secondary" className="tabular-nums">
            {totalCount}
          </Badge>
        </button>

        {/* Per-agent rows */}
        {agents.map((agent) => {
          const color = getAgentColor(agent.id)
          const displayName = getAgentDisplayName(agent.id)
          const count = countForAgent(agent.id)
          const isActive = selectedAgentId === agent.id
          const isDetected = agent.detected

          return (
            <button
              key={agent.id}
              type="button"
              disabled={!isDetected}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : isDetected
                    ? "text-foreground hover:bg-muted"
                    : "cursor-not-allowed text-muted-foreground opacity-50"
              )}
            >
              {/* Colored dot */}
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: isDetected ? color : undefined }}
              />
              <span className="flex-1 truncate text-left">{displayName}</span>
              {isDetected && (
                <Badge variant="secondary" className="tabular-nums">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </nav>

      {/* Settings button */}
      <div className="border-t border-border p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="size-4" />
          Settings
        </Button>
      </div>
    </aside>
  )
}
