import { create } from "zustand";
import type { Skill } from "@/types";

interface SkillState {
  skills: Skill[];
  selectedSkillId: string | null;
  searchQuery: string;
  /** Set by keyboard shortcut to request the delete dialog for a skill. */
  pendingDeleteId: string | null;
}

interface SkillActions {
  setSkills: (skills: Skill[]) => void;
  setSelectedSkillId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  /** Remove a skill from the store by ID (optimistic delete). */
  removeSkill: (id: string) => void;
  /** Replace a single skill in the store in-place (optimistic update). */
  updateSkillInPlace: (updated: Skill) => void;
  setPendingDeleteId: (id: string | null) => void;
}

export const useSkillStore = create<SkillState & SkillActions>()((set) => ({
  // State
  skills: [],
  selectedSkillId: null,
  searchQuery: "",
  pendingDeleteId: null,

  // Actions
  setSkills: (skills) => set({ skills }),
  setSelectedSkillId: (id) => set({ selectedSkillId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  removeSkill: (id) =>
    set((state) => ({
      skills: state.skills.filter((s) => s.id !== id),
      // Deselect if the removed skill was selected.
      selectedSkillId:
        state.selectedSkillId === id ? null : state.selectedSkillId,
    })),
  updateSkillInPlace: (updated) =>
    set((state) => ({
      skills: state.skills.map((s) => (s.id === updated.id ? updated : s)),
    })),
  setPendingDeleteId: (id) => set({ pendingDeleteId: id }),
}));
