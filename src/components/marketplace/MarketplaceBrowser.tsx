import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarketplace } from "@/hooks/useMarketplace"
import { SkillCard } from "./SkillCard"
import { SkillsLeaderboard } from "./SkillsLeaderboard"
import { MarketplaceInstallDialog } from "./MarketplaceInstallDialog"
import { SkillDetailDialog } from "./SkillDetailDialog"
import type { MarketplaceSkill } from "@/types"

export function MarketplaceBrowser() {
  const { results, query, isSearching, searchError, cliAvailable, search } =
    useMarketplace()

  const [installTarget, setInstallTarget] = useState<MarketplaceSkill | null>(
    null,
  )
  const [installDialogOpen, setInstallDialogOpen] = useState(false)

  const [detailTarget, setDetailTarget] = useState<MarketplaceSkill | null>(
    null,
  )
  const [detailOpen, setDetailOpen] = useState(false)

  function handleInstall(skill: MarketplaceSkill) {
    setInstallTarget(skill)
    setInstallDialogOpen(true)
  }

  function handleRead(skill: MarketplaceSkill) {
    setDetailTarget(skill)
    setDetailOpen(true)
  }

  const hasQuery = query.trim().length > 0
  const showLeaderboard = !hasQuery && !isSearching && results.length === 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Marketplace</h2>
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search skills.sh…"
            value={query}
            onChange={(e) => search(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* CLI unavailable banner */}
      {cliAvailable === false && (
        <div className="border-b border-border bg-surface px-4 py-2">
          <p className="text-xs text-muted-foreground">
            Marketplace requires the skills CLI.{" "}
            <span className="text-foreground">
              Install Node.js, then run: <code>npx skills --version</code>
            </span>
          </p>
        </div>
      )}

      {/* Leaderboard (empty state) */}
      {showLeaderboard && (
        <SkillsLeaderboard onInstall={handleInstall} onRead={handleRead} />
      )}

      {/* Search results */}
      {!showLeaderboard && (
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isSearching && (
              <p className="text-sm text-muted-foreground animate-pulse">
                Searching…
              </p>
            )}

            {searchError && (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">{searchError}</p>
                <Button variant="outline" size="xs" onClick={() => search(query)}>
                  Retry
                </Button>
              </div>
            )}

            {!isSearching && !searchError && results.length === 0 && hasQuery && (
              <p className="text-sm text-muted-foreground">
                No skills found for &ldquo;{query}&rdquo;
              </p>
            )}

            {results.length > 0 && (
              <>
              <p className="pb-2 text-xs text-muted-foreground">
                {results.length} {results.length === 1 ? "result" : "results"}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {results.map((skill) => (
                  <SkillCard
                    key={skill.package}
                    skill={skill}
                    onInstall={handleInstall}
                    onRead={handleRead}
                  />
                ))}
              </div>
              </>
            )}
          </div>
        </ScrollArea>
      )}

      <SkillDetailDialog
        skill={detailTarget}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onInstall={handleInstall}
      />

      <MarketplaceInstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        skill={installTarget}
      />
    </div>
  )
}
