import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useLeaderboardStore, type Tab } from "@/stores/leaderboardStore"
import type { LeaderboardSkill, MarketplaceSkill } from "@/types"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function formatInstalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function toMarketplaceSkill(skill: LeaderboardSkill): MarketplaceSkill {
  return {
    package: `${skill.source}@${skill.name}`,
    name: skill.name,
    source: skill.source,
    description: "",
    installCount: formatInstalls(skill.installs),
    url: `https://skills.sh/${skill.source}/${skill.name}`,
  }
}

interface SkillsLeaderboardProps {
  onInstall: (skill: MarketplaceSkill) => void
  onRead: (skill: MarketplaceSkill) => void
}

export function SkillsLeaderboard({ onInstall, onRead }: SkillsLeaderboardProps) {
  const [tab, setTab] = useState<Tab>("all")
  const { data, loading, error, fetchAll } = useLeaderboardStore()

  useEffect(() => { fetchAll() }, [fetchAll])

  const skills = data[tab]
  const isLoading = loading[tab]
  const tabError = error[tab]

  const tabs: { id: Tab; label: string; tooltip: string }[] = [
    { id: "all", label: "All Time", tooltip: "Most installed skills overall" },
    { id: "trending", label: "Trending", tooltip: "Fastest growing this week" },
    { id: "hot", label: "Hot", tooltip: "Most installed this week" },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <TooltipProvider delay={200}>
        <div className="flex items-center gap-1 px-4 pt-3 pb-2">
          {tabs.map((t) => (
            <Tooltip key={t.id}>
              <TooltipTrigger>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    tab === t.id
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              </TooltipTrigger>
              <TooltipContent>{t.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Table header */}
      <div className="grid grid-cols-[2.5rem_1fr_auto] gap-2 px-6 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <span>#</span>
        <span>Skill</span>
        <span className="text-right">Installs</span>
      </div>

      {/* Content */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 pb-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse px-3 py-4">
              Loading leaderboard...
            </p>
          )}

          {tabError && (
            <p className="text-sm text-destructive px-3 py-4">{tabError}</p>
          )}

          {!isLoading && !tabError && skills.length === 0 && (
            <p className="text-sm text-muted-foreground px-3 py-4">
              No skills found.
            </p>
          )}

          {!isLoading && !tabError && skills.map((skill) => {
            const ms = toMarketplaceSkill(skill)
            return (
              <button
                key={`${skill.source}/${skill.name}`}
                type="button"
                onClick={() => onRead(ms)}
                className="grid w-full grid-cols-[2.5rem_1fr_auto] gap-2 items-center rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted group"
              >
                <span className="text-xs tabular-nums text-muted-foreground">
                  {skill.rank}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-sm font-medium text-foreground" title={skill.name}>
                    {skill.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground" title={skill.source}>
                    {skill.source}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onInstall(ms)
                    }}
                  >
                    Install
                  </Button>
                  <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                    {formatInstalls(skill.installs)}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
