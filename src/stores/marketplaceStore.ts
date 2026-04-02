import { create } from "zustand";
import type { MarketplaceSkill } from "@/types";

interface MarketplaceState {
  results: MarketplaceSkill[];
  query: string;
  isSearching: boolean;
  searchError: string | null;
  cliAvailable: boolean | null;
}

interface MarketplaceActions {
  setResults: (results: MarketplaceSkill[]) => void;
  setQuery: (query: string) => void;
  setIsSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  setCliAvailable: (available: boolean | null) => void;
}

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>()(
  (set) => ({
    // State
    results: [],
    query: "",
    isSearching: false,
    searchError: null,
    cliAvailable: null,

    // Actions
    setResults: (results) => set({ results }),
    setQuery: (query) => set({ query }),
    setIsSearching: (isSearching) => set({ isSearching }),
    setSearchError: (searchError) => set({ searchError }),
    setCliAvailable: (cliAvailable) => set({ cliAvailable }),
  }),
);
