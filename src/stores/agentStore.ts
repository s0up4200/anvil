import { create } from "zustand";
import type { Agent } from "@/types";

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
}

interface AgentActions {
  setAgents: (agents: Agent[]) => void;
  setSelectedAgentId: (id: string | null) => void;
}

export const useAgentStore = create<AgentState & AgentActions>()((set) => ({
  // State
  agents: [],
  selectedAgentId: null,

  // Actions
  setAgents: (agents) => set({ agents }),
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));
