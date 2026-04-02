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
import { useUIStore } from "@/stores/uiStore"
import { resolveTheme } from "@/lib/utils"

export default function App() {
  const { theme, activeView, createDialogOpen, setCreateDialogOpen } = useUIStore()
  useAgents()
  const { refetch } = useSkills()
  useFileWatcher(refetch)
  useKeyboard()
  useUpdateChecker()

  // Apply theme class to <html>
  useEffect(() => {
    const isDark = resolveTheme(theme) === "dark"
    document.documentElement.classList.toggle("dark", isDark)
  }, [theme])

  return (
    <div className="flex h-screen bg-background text-foreground">
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
    </div>
  )
}
