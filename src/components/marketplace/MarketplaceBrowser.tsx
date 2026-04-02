import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useMarketplace } from "@/hooks/useMarketplace"
import { SkillCard } from "./SkillCard"
import { MarketplaceInstallDialog } from "./MarketplaceInstallDialog"
import type { MarketplaceSkill } from "@/types"

export function MarketplaceBrowser() {
  const { results, query, isSearching, searchError, cliAvailable, search } =
    useMarketplace()

  const [installTarget, setInstallTarget] = useState<MarketplaceSkill | null>(
    null,
  )
  const [installDialogOpen, setInstallDialogOpen] = useState(false)

  function handleInstall(skill: MarketplaceSkill) {
    setInstallTarget(skill)
    setInstallDialogOpen(true)
  }

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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isSearching && (
            <p className="text-sm text-muted-foreground animate-pulse">
              Searching…
            </p>
          )}

          {searchError && (
            <p className="text-sm text-destructive">{searchError}</p>
          )}

          {!isSearching && !searchError && results.length === 0 && query.trim() && (
            <p className="text-sm text-muted-foreground">
              No skills found for &ldquo;{query}&rdquo;
            </p>
          )}

          {!isSearching && !searchError && results.length === 0 && !query.trim() && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Search for skills from the skills.sh registry
              </p>
              <p className="text-xs text-muted-foreground">
                Try &ldquo;resend&rdquo;, &ldquo;clerk&rdquo;, or &ldquo;vercel&rdquo;
              </p>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {results.map((skill) => (
                <SkillCard
                  key={skill.package}
                  skill={skill}
                  onInstall={handleInstall}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <MarketplaceInstallDialog
        open={installDialogOpen}
        onOpenChange={setInstallDialogOpen}
        skill={installTarget}
      />
    </div>
  )
}
