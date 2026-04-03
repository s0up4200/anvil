import { useMemo } from "react"
import { Copy, Settings, Store, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAgentStore } from "@/stores/agentStore"
import { useSkillStore } from "@/stores/skillStore"
import { useUIStore } from "@/stores/uiStore"
import { useUpdateStore } from "@/stores/updateStore"
import { getAgentColor } from "@/lib/constants"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types"

export function Sidebar() {
  const { agents, selectedAgentId, setSelectedAgentId } = useAgentStore()
  const { skills } = useSkillStore()
  const { activeView, setActiveView, setSettingsOpen } = useUIStore()
  const updateCount = useUpdateStore((s) => s.pendingUpdates.length)

  const totalCount = skills.length

  function countForAgent(agentId: string): number {
    return skills.filter((s) => s.agentIds.includes(agentId)).length
  }

  const { withSkills, empty } = useMemo(() => {
    const detected = agents.filter((a) => a.detected)
    const w: (Agent & { count: number })[] = []
    const e: (Agent & { count: number })[] = []
    for (const agent of detected) {
      const count = countForAgent(agent.id)
      if (count > 0) w.push({ ...agent, count })
      else e.push({ ...agent, count: 0 })
    }
    w.sort((a, b) => a.name.localeCompare(b.name))
    e.sort((a, b) => a.name.localeCompare(b.name))
    return { withSkills: w, empty: e }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, skills])

  function copyPath(path: string) {
    navigator.clipboard.writeText(path)
  }

  function renderAgentRow(agent: Agent & { count: number }, dimmed: boolean) {
    const color = getAgentColor(agent)
    const isActive = activeView === "skills" && selectedAgentId === agent.id

    return (
      <ContextMenu key={agent.id}>
        <Tooltip>
          <TooltipTrigger>
            <ContextMenuTrigger>
              <button
                type="button"
                onClick={() => { setSelectedAgentId(agent.id); setActiveView("skills") }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground font-medium"
                    : dimmed
                      ? "text-muted-foreground hover:bg-muted"
                      : "text-foreground hover:bg-muted"
                )}
              >
                <span
                  className={cn("size-2 shrink-0 rounded-full", dimmed && "opacity-50")}
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-left">{agent.name}</span>
                {agent.count > 0 && (
                  <Badge variant="secondary" className="tabular-nums">
                    {agent.count}
                  </Badge>
                )}
              </button>
            </ContextMenuTrigger>
          </TooltipTrigger>
          {agent.skillsPath && (
            <TooltipContent side="right" className="font-mono text-[11px]">
              {agent.skillsPath}
            </TooltipContent>
          )}
        </Tooltip>
        {agent.skillsPath && (
          <ContextMenuContent>
            <ContextMenuItem onClick={() => copyPath(agent.skillsPath!)}>
              <Copy className="mr-2 size-3.5" />
              Copy skills path
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    )
  }

  return (
    <aside className="flex h-full w-48 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Agent list */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {/* All Skills row */}
        <button
          type="button"
          onClick={() => { setSelectedAgentId(null); setActiveView("skills") }}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
            activeView === "skills" && selectedAgentId === null
              ? "bg-accent text-accent-foreground font-medium"
              : "text-foreground hover:bg-muted"
          )}
        >
          <span>All Skills</span>
          <Badge variant="secondary" className="tabular-nums">
            {totalCount}
          </Badge>
        </button>

        {/* Agents with skills */}
        {withSkills.map((agent) => renderAgentRow(agent, false))}

        {/* Empty agents */}
        {empty.length > 0 && (
          <>
            <span className="mt-3 mb-1 px-2 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Installed — no skills
            </span>
            {empty.map((agent) => renderAgentRow(agent, true))}
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-border p-2 flex flex-col gap-0.5">
        <Button
          variant={activeView === "marketplace" ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setActiveView("marketplace")}
        >
          <Store className="size-4" />
          Marketplace
        </Button>
        <Button
          variant={activeView === "updates" ? "secondary" : "ghost"}
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setActiveView("updates")}
        >
          <RefreshCw className="size-4" />
          Updates
          {updateCount > 0 && (
            <Badge variant="default" className="ml-auto tabular-nums text-xs px-1.5 py-0">
              {updateCount}
            </Badge>
          )}
        </Button>
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
