import { useEffect, useState } from "react";
import { detectAgents } from "@/lib/tauri";
import { useAgentStore } from "@/stores/agentStore";
import type { Agent } from "@/types";

interface UseAgentsResult {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Fetches all agents on mount, populates the agent store, and exposes
 * loading/error state to the caller.
 */
export function useAgents(): UseAgentsResult {
  const { agents, setAgents } = useAgentStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    detectAgents()
      .then((result) => {
        if (!cancelled) {
          setAgents(result);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setAgents]);

  return { agents, isLoading, error };
}
