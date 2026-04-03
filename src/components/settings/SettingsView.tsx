import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUIStore, type Theme } from "@/stores/uiStore"
import { useAgentStore } from "@/stores/agentStore"
import { getConfig, saveConfig } from "@/lib/tauri"
import { getAgentDisplayName, getAgentColor } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  SlidersHorizontal,
  Bot,
  Globe,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { AppConfig } from "@/types"

const DEFAULT_CONFIG: AppConfig = {
  customAgents: [],
  followSymlinks: true,
  vaultPath: null,
  showHidden: false,
  theme: "system",
  defaultScope: "global",
  confirmBeforeDelete: true,
  checkForSkillUpdates: false,
}

const themeOptions: { value: Theme; icon: LucideIcon; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
]

// ── Shared sub-components ──

interface SectionHeaderProps {
  icon: LucideIcon
  label: string
}

function SectionHeader({ icon: Icon, label }: SectionHeaderProps): React.ReactNode {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

function ToggleRow({ label, description, checked, onCheckedChange }: ToggleRowProps): React.ReactNode {
  return (
    <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{description}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

// ── Main component ──

export function SettingsView() {
  const { settingsOpen, setSettingsOpen, theme, setTheme } = useUIStore()
  const { agents } = useAgentStore()

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)

  // Load config when dialog opens.
  useEffect(() => {
    if (!settingsOpen) return
    getConfig()
      .then(setConfig)
      .catch((err: unknown) => {
        console.error("Failed to load config:", err)
      })
  }, [settingsOpen])

  function updateConfig(patch: Partial<AppConfig>): void {
    const next = { ...config, ...patch }
    setConfig(next)
    void saveConfig(next)
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-[28rem] h-[min(32rem,85vh)] flex flex-col" showCloseButton>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 -mx-4 px-4">
          <div className="flex flex-col gap-6 pb-2">
            {/* ── Theme ── */}
            <section>
              <SectionHeader icon={Palette} label="Theme" />
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setTheme(value)
                      updateConfig({ theme: value })
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all",
                      theme === value
                        ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary/20"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Default Scope ── */}
            <section>
              <SectionHeader icon={Globe} label="Default Scope" />
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">New skill scope</span>
                    <span className="text-[11px] text-muted-foreground">
                      Where new skills are created by default
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {(["global", "project"] as const).map((scope) => (
                      <button
                        key={scope}
                        type="button"
                        onClick={() => updateConfig({ defaultScope: scope })}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          config.defaultScope === scope
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {scope === "global" ? "Global" : "Project"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── Preferences ── */}
            <section>
              <SectionHeader icon={SlidersHorizontal} label="Preferences" />
              <div className="rounded-lg border border-border divide-y divide-border">
                <ToggleRow
                  label="Check for skill updates"
                  description="Automatically check on startup"
                  checked={config.checkForSkillUpdates}
                  onCheckedChange={(checked) => updateConfig({ checkForSkillUpdates: checked })}
                />
                <ToggleRow
                  label="Confirm before delete"
                  description="Show a confirmation dialog when removing skills"
                  checked={config.confirmBeforeDelete}
                  onCheckedChange={(checked) => updateConfig({ confirmBeforeDelete: checked })}
                />
              </div>
            </section>

            {/* ── Agents ── */}
            <section>
              <SectionHeader icon={Bot} label="Agents" />
              {agents.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No agents found on this system.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: getAgentColor(agent.id) }}
                      />
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <span className="text-xs font-medium text-foreground">
                          {getAgentDisplayName(agent.id)}
                        </span>
                        {agent.skillsPath ? (
                          <span className="truncate text-[11px] text-muted-foreground font-mono">
                            {agent.skillsPath}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Path unavailable
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          agent.detected
                            ? "bg-status-pass/15 text-status-pass"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {agent.detected ? "Detected" : "Not found"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
