import { useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { SkillList } from "@/components/layout/SkillList"
import { SkillDetail } from "@/components/layout/SkillDetail"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { CreateSkillDialog } from "@/components/skills/CreateSkillDialog"
import { SettingsView } from "@/components/settings/SettingsView"
import { useAgents } from "@/hooks/useAgents"
import { useSkills } from "@/hooks/useSkills"
import { useFileWatcher } from "@/hooks/useFileWatcher"
import { useKeyboard } from "@/hooks/useKeyboard"
import { useUIStore } from "@/stores/uiStore"
import { resolveTheme } from "@/lib/utils"

export default function App() {
  const { theme, createDialogOpen, setCreateDialogOpen } = useUIStore()
  useAgents()
  const { refetch } = useSkills()
  useFileWatcher(refetch)
  useKeyboard()

  // Apply theme class to <html>
  useEffect(() => {
    const isDark = resolveTheme(theme) === "dark"
    document.documentElement.classList.toggle("dark", isDark)
  }, [theme])

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <SkillList />
      <SkillDetail />
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
