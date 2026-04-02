import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useSkillStore } from "@/stores/skillStore";

/**
 * Registers global keyboard shortcuts:
 * - Cmd+K (Mac) / Ctrl+K (Windows/Linux): toggle command palette
 * - Cmd+, (Mac) / Ctrl+, (Windows/Linux): toggle settings
 * - ArrowUp / ArrowDown: navigate the skill list
 */
export function useKeyboard(): void {
  const { setCommandPaletteOpen, setSettingsOpen, setCreateDialogOpen } = useUIStore();
  const { skills, selectedSkillId, setSelectedSkillId } = useSkillStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!useUIStore.getState().commandPaletteOpen);
        return;
      }

      if (meta && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(!useUIStore.getState().settingsOpen);
        return;
      }

      if (meta && e.key === "n") {
        e.preventDefault();
        setCreateDialogOpen(!useUIStore.getState().createDialogOpen);
        return;
      }

      // Arrow key navigation through the skill list.
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (skills.length === 0) return;

        const currentIndex = selectedSkillId
          ? skills.findIndex((s) => s.id === selectedSkillId)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < skills.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : skills.length - 1;
        }

        const nextSkill = skills[nextIndex];
        if (nextSkill) {
          e.preventDefault();
          setSelectedSkillId(nextSkill.id);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setCommandPaletteOpen,
    setSettingsOpen,
    setCreateDialogOpen,
    skills,
    selectedSkillId,
    setSelectedSkillId,
  ]);
}
