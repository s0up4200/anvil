import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { useUIStore } from "@/stores/uiStore"
import { useAgentStore } from "@/stores/agentStore"
import { getConfig, saveConfig } from "@/lib/tauri"
import { getAgentDisplayName } from "@/lib/constants"
import type { AppConfig } from "@/types"

type Theme = "dark" | "light" | "system"

const DEFAULT_CONFIG: AppConfig = {
  customAgents: [],
  followSymlinks: true,
  vaultPath: null,
  showHidden: false,
}

export function SettingsView() {
  const { settingsOpen, setSettingsOpen, theme, setTheme } = useUIStore()
  const { agents } = useAgentStore()

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [editorFont, setEditorFont] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load config when dialog opens.
  useEffect(() => {
    if (!settingsOpen) return
    getConfig()
      .then((cfg) => {
        setConfig(cfg)
      })
      .catch((err: unknown) => {
        console.error("Failed to load config:", err)
      })
  }, [settingsOpen])

  function handleOpenChange(next: boolean) {
    setSettingsOpen(next)
    if (!next) {
      setError(null)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      await saveConfig(config)
      setSettingsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="appearance">
          <TabsList>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
          </TabsList>

          {/* Appearance tab */}
          <TabsContent value="appearance">
            <div className="flex flex-col gap-4 pt-2">
              {/* Theme selector */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-foreground">Theme</p>
                <div className="flex gap-2">
                  {(["dark", "light", "system"] as Theme[]).map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme(t)}
                      className="capitalize"
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Editor font */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="editor-font"
                  className="text-xs font-medium text-foreground"
                >
                  Editor Font{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="editor-font"
                  placeholder="e.g. JetBrains Mono, monospace"
                  value={editorFont}
                  onChange={(e) => setEditorFont(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Font family used in the skill editor.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Agents tab */}
          <TabsContent value="agents">
            <div className="flex flex-col gap-2 pt-2">
              {agents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents found.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border rounded-lg border">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-start justify-between gap-3 px-3 py-2"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-medium">
                          {getAgentDisplayName(agent.id)}
                        </span>
                        {agent.skillsPath ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {agent.skillsPath}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Path unavailable
                          </span>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          agent.detected
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {agent.detected ? "Detected" : "Not found"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <DialogFooter showCloseButton>
          <Button
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
