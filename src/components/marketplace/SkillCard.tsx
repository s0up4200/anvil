import { Button } from "@/components/ui/button"
import type { MarketplaceSkill } from "@/types"

interface SkillCardProps {
  skill: MarketplaceSkill
  onInstall: (skill: MarketplaceSkill) => void
  onRead: (skill: MarketplaceSkill) => void
}

export function SkillCard({ skill, onInstall, onRead }: SkillCardProps) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 cursor-pointer hover:border-foreground/20 transition-colors"
      onClick={() => onRead(skill)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">
            {skill.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {skill.source}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {skill.installCount}
        </span>
      </div>

      {skill.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {skill.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        {skill.url ? (
          <a
            href={skill.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            skills.sh
          </a>
        ) : (
          <span />
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onInstall(skill)
          }}
        >
          Install
        </Button>
      </div>
    </div>
  )
}
