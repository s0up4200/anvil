import { Moon, Settings, Sun, Store, RefreshCw } from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useUIStore } from "@/stores/uiStore"
import { useSkillStore } from "@/stores/skillStore"
import { useAgentStore } from "@/stores/agentStore"
import { getAgentDisplayName } from "@/lib/constants"

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, theme, setTheme, setSettingsOpen, setActiveView } =
    useUIStore()
  const { skills, setSelectedSkillId } = useSkillStore()
  const { agents, setSelectedAgentId } = useAgentStore()

  function close() {
    setCommandPaletteOpen(false)
  }

  function selectSkill(id: string) {
    setSelectedSkillId(id)
    close()
  }

  function filterByAgent(id: string) {
    setSelectedAgentId(id)
    close()
  }

  function openSettings() {
    setSettingsOpen(true)
    close()
  }

  function switchTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
    close()
  }

  const detectedAgents = agents.filter((a) => a.detected)

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <Command>
        <CommandInput placeholder="Search commands, skills…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Actions */}
          <CommandGroup heading="Actions">
            <CommandItem onSelect={openSettings}>
              <Settings />
              Open Settings
            </CommandItem>
            <CommandItem onSelect={switchTheme}>
              {theme === "dark" ? <Sun /> : <Moon />}
              Switch to {theme === "dark" ? "Light" : "Dark"} Theme
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView("marketplace"); close() }}>
              <Store />
              Open Marketplace
            </CommandItem>
            <CommandItem onSelect={() => { setActiveView("updates"); close() }}>
              <RefreshCw />
              Check for Updates
            </CommandItem>
          </CommandGroup>

          {detectedAgents.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Agents">
                {detectedAgents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    value={`agent-${agent.id}`}
                    onSelect={() => filterByAgent(agent.id)}
                  >
                    {getAgentDisplayName(agent.id)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {skills.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Skills">
                {skills.map((skill) => (
                  <CommandItem
                    key={skill.id}
                    value={`skill-${skill.id}-${skill.name}`}
                    onSelect={() => selectSkill(skill.id)}
                  >
                    {skill.name}
                    {skill.frontmatter?.description && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {skill.frontmatter.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
