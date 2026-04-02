import { create } from "zustand";
import type { SkillUpdate } from "@/types";

interface UpdateState {
  pendingUpdates: SkillUpdate[];
  lastChecked: string | null;
  isChecking: boolean;
  checkError: string | null;
  updatingSkills: string[];
}

interface UpdateActions {
  setPendingUpdates: (updates: SkillUpdate[]) => void;
  setLastChecked: (timestamp: string | null) => void;
  setIsChecking: (checking: boolean) => void;
  setCheckError: (error: string | null) => void;
  markUpdating: (skillName: string) => void;
  clearUpdating: (skillName: string) => void;
  removeUpdate: (skillName: string) => void;
}

export const useUpdateStore = create<UpdateState & UpdateActions>()((set) => ({
  // State
  pendingUpdates: [],
  lastChecked: null,
  isChecking: false,
  checkError: null,
  updatingSkills: [],

  // Actions
  setPendingUpdates: (pendingUpdates) => set({ pendingUpdates }),
  setLastChecked: (lastChecked) => set({ lastChecked }),
  setIsChecking: (isChecking) => set({ isChecking }),
  setCheckError: (checkError) => set({ checkError }),
  markUpdating: (skillName) =>
    set((state) => ({
      updatingSkills: [...state.updatingSkills, skillName],
    })),
  clearUpdating: (skillName) =>
    set((state) => ({
      updatingSkills: state.updatingSkills.filter((s) => s !== skillName),
    })),
  removeUpdate: (skillName) =>
    set((state) => ({
      pendingUpdates: state.pendingUpdates.filter(
        (u) => u.skillName !== skillName,
      ),
    })),
}));
