import { create } from "zustand";

export type Theme = "dark" | "light" | "system";
export type ActiveView = "skills" | "marketplace" | "updates";

interface UIState {
  theme: Theme;
  activeView: ActiveView;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  createDialogOpen: boolean;
  sidebarCollapsed: boolean;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  setActiveView: (view: ActiveView) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCreateDialogOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  // State
  theme: "system",
  activeView: "skills",
  commandPaletteOpen: false,
  settingsOpen: false,
  createDialogOpen: false,
  sidebarCollapsed: false,

  // Actions
  setTheme: (theme) => set({ theme }),
  setActiveView: (activeView) => set({ activeView }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCreateDialogOpen: (open) => set({ createDialogOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
