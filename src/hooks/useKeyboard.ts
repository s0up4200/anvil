import { useEffect } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useSkillStore } from "@/stores/skillStore";
import { deleteSkill, duplicateSkill } from "@/lib/tauri";

/**
 * Registers global keyboard shortcuts:
 * - Cmd+K (Mac) / Ctrl+K (Windows/Linux): toggle command palette
 * - Cmd+, (Mac) / Ctrl+, (Windows/Linux): toggle settings
 * - ArrowUp / ArrowDown: navigate the skill list
 */
export function useKeyboard(): void {
  const { setCommandPaletteOpen, setSettingsOpen, setCreateDialogOpen } = useUIStore();
  const { skills, selectedSkillId, setSelectedSkillId, removeSkill } = useSkillStore();

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

      if (meta && e.shiftKey && e.key === "M") {
        e.preventDefault();
        useUIStore.getState().setActiveView("marketplace");
        return;
      }

      if (meta && e.shiftKey && e.key === "U") {
        e.preventDefault();
        useUIStore.getState().setActiveView("updates");
        return;
      }

      if (meta && e.key === "d") {
        e.preventDefault();
        if (!selectedSkillId) return;
        const skill = skills.find((s) => s.id === selectedSkillId);
        if (skill) duplicateSkill(skill.path);
        return;
      }

      if (meta && e.key === "Backspace") {
        e.preventDefault();
        if (
          useUIStore.getState().commandPaletteOpen ||
          useUIStore.getState().settingsOpen ||
          useUIStore.getState().createDialogOpen
        )
          return;
        if (!selectedSkillId) return;
        const skill = skills.find((s) => s.id === selectedSkillId);
        if (skill) {
          deleteSkill(skill.path);
          removeSkill(skill.id);
        }
        return;
      }

      if (e.key === "Escape") {
        if (useUIStore.getState().commandPaletteOpen) {
          setCommandPaletteOpen(false);
        } else if (useUIStore.getState().settingsOpen) {
          setSettingsOpen(false);
        } else if (useUIStore.getState().createDialogOpen) {
          setCreateDialogOpen(false);
        } else {
          setSelectedSkillId(null);
        }
        return;
      }

      if (e.key === "Enter") {
        if (
          useUIStore.getState().commandPaletteOpen ||
          useUIStore.getState().settingsOpen ||
          useUIStore.getState().createDialogOpen
        )
          return;
        if (!selectedSkillId) return;
        if (useUIStore.getState().activeView !== "skills") {
          useUIStore.getState().setActiveView("skills");
        }
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
    removeSkill,
  ]);
}
