import { useCallback, useEffect, useMemo, useState } from "react";
import { scanAllSkills } from "@/lib/tauri";
import { useSkillStore } from "@/stores/skillStore";
import { useAgentStore } from "@/stores/agentStore";
import type { Skill } from "@/types";

interface UseSkillsResult {
  /** Filtered and sorted list of skills. */
  skills: Skill[];
  /** The currently selected skill object, or null. */
  selectedSkill: Skill | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches skills once agents are loaded, applies search/filter from the store,
 * and exposes a refetch callback for file-watcher triggered refreshes.
 */
export function useSkills(): UseSkillsResult {
  const { skills, setSkills, selectedSkillId, searchQuery } = useSkillStore();
  const { agents, selectedAgentId } = useAgentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSkills = useCallback(() => {
    setIsLoading(true);
    setError(null);

    scanAllSkills()
      .then((result) => {
        setSkills(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
      });
  }, [setSkills]);

  // Fetch when agents are loaded (agents array becomes non-empty).
  useEffect(() => {
    if (agents.length > 0) {
      fetchSkills();
    }
  }, [agents.length, fetchSkills]);

  const filteredSkills = useMemo(() => {
    let result = skills;

    // Filter by selected agent.
    if (selectedAgentId) {
      result = result.filter((s) => s.agentIds.includes(selectedAgentId));
    }

    // Filter by search query (name or description).
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.frontmatter?.description ?? "").toLowerCase().includes(q)
      );
    }

    // Sort alphabetically by name.
    return [...result].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [skills, selectedAgentId, searchQuery]);

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId) ?? null,
    [skills, selectedSkillId]
  );

  return {
    skills: filteredSkills,
    selectedSkill,
    isLoading,
    error,
    refetch: fetchSkills,
  };
}
