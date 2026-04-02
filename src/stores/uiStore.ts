import { create } from "zustand";

type Theme = "dark" | "light" | "system";

interface UIState {
  theme: Theme;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;
  createDialogOpen: boolean;
  sidebarCollapsed: boolean;
}

interface UIActions {
  setTheme: (theme: Theme) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleCreateDialog: () => void;
  setCreateDialogOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  // State
  theme: "system",
  commandPaletteOpen: false,
  settingsOpen: false,
  createDialogOpen: false,
  sidebarCollapsed: false,

  // Actions
  setTheme: (theme) => set({ theme }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleSettings: () =>
    set((state) => ({ settingsOpen: !state.settingsOpen })),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  toggleCreateDialog: () =>
    set((state) => ({ createDialogOpen: !state.createDialogOpen })),
  setCreateDialogOpen: (open) => set({ createDialogOpen: open }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
