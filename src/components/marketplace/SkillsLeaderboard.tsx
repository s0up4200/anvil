import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { useLeaderboardStore } from "@/stores/leaderboardStore"
import type { LeaderboardSkill, MarketplaceSkill } from "@/types"
import { cn } from "@/lib/utils"

type Tab = "all" | "trending" | "hot"

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

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "All Time" },
    { id: "trending", label: "Trending" },
    { id: "hot", label: "Hot" },
  ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 pt-3 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
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
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[2.5rem_1fr_auto] gap-2 px-4 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        <span>#</span>
        <span>Skill</span>
        <span className="text-right">Installs</span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">
              Loading leaderboard...
            </p>
          )}

          {tabError && (
            <p className="text-sm text-destructive py-8 text-center">{tabError}</p>
          )}

          {!isLoading && !tabError && skills.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
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
                className="grid w-full grid-cols-[2.5rem_1fr_auto] gap-2 items-center rounded-md px-0 py-1.5 text-left transition-colors hover:bg-muted group"
              >
                <span className="text-xs tabular-nums text-muted-foreground pl-1">
                  {skill.rank}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {skill.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {skill.source}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatInstalls(skill.installs)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      onInstall(ms)
                    }}
                  >
                    Install
                  </Button>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
