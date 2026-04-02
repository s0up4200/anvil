import { useEffect } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { SkillList } from "@/components/layout/SkillList"
import { SkillDetail } from "@/components/layout/SkillDetail"
import { CommandPalette } from "@/components/layout/CommandPalette"
import { useAgents } from "@/hooks/useAgents"
import { useSkills } from "@/hooks/useSkills"
import { useFileWatcher } from "@/hooks/useFileWatcher"
import { useKeyboard } from "@/hooks/useKeyboard"
import { useUIStore } from "@/stores/uiStore"

export default function App() {
  const { theme } = useUIStore()
  useAgents()
  const { refetch } = useSkills()
  useFileWatcher(refetch)
  useKeyboard()

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "light") {
      root.classList.remove("dark")
    } else {
      // system: follow OS preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      root.classList.toggle("dark", prefersDark)
    }
  }, [theme])

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar />
      <SkillList />
      <SkillDetail />
      <CommandPalette />
    </div>
  )
}
