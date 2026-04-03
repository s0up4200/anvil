import { useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { SkillList } from "@/components/layout/SkillList"
import { SkillDetail } from "@/components/layout/SkillDetail"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { CreateSkillDialog } from "@/components/skills/CreateSkillDialog"
import { SettingsView } from "@/components/settings/SettingsView"
import { MarketplaceBrowser } from "@/components/marketplace/MarketplaceBrowser"
import { UpdateCenter } from "@/components/marketplace/UpdateCenter"
import { useAgents } from "@/hooks/useAgents"
import { useSkills } from "@/hooks/useSkills"
import { useFileWatcher } from "@/hooks/useFileWatcher"
import { useKeyboard } from "@/hooks/useKeyboard"
import { useUpdateChecker } from "@/hooks/useUpdateChecker"
import { useUIStore, type Theme } from "@/stores/uiStore"
import { getConfig } from "@/lib/tauri"
import { resolveTheme } from "@/lib/utils"

export default function App() {
  const { theme, setTheme, activeView, createDialogOpen, setCreateDialogOpen } = useUIStore()
  useAgents()

  // Hydrate theme from persisted config on mount
  useEffect(() => {
    getConfig().then((cfg) => {
      if (cfg.theme) setTheme(cfg.theme as Theme)
    }).catch(() => {})
  }, [setTheme])
  const { refetch } = useSkills()
  useFileWatcher(refetch)
  useKeyboard()
  useUpdateChecker()

  // Disable default browser context menu unless inside a Radix ContextMenuTrigger
  useEffect(() => {
    function block(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-slot="context-menu-trigger"]')) return
      e.preventDefault()
    }
    window.addEventListener("contextmenu", block)
    return () => window.removeEventListener("contextmenu", block)
  }, [])

  // Apply theme class to <html>
  useEffect(() => {
    const isDark = resolveTheme(theme) === "dark"
    document.documentElement.classList.toggle("dark", isDark)
  }, [theme])

  return (
    <main className="flex h-full min-w-0 overflow-hidden">
      <Sidebar />
      {activeView === "skills" && (
        <>
          <SkillList />
          <SkillDetail />
        </>
      )}
      {activeView === "marketplace" && <MarketplaceBrowser />}
      {activeView === "updates" && <UpdateCenter />}
      <CommandPalette />
      <CreateSkillDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={refetch}
      />
      <SettingsView />
    </main>
  )
}
