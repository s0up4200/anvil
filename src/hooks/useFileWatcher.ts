import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { startFileWatcher } from "@/lib/tauri";
import { useAgentStore } from "@/stores/agentStore";
import type { SkillChangeEvent } from "@/types";

/**
 * Starts the Tauri file watcher for all detected agent skill directories and
 * listens for "skill-changed" events. Calls `onRefetch` whenever a change is
 * detected so the skills list stays in sync with the filesystem.
 */
export function useFileWatcher(onRefetch: () => void): void {
  const { agents } = useAgentStore();

  useEffect(() => {
    if (agents.length === 0) return;

    // Collect all skill paths that exist (non-null).
    const paths = agents
      .map((a) => a.skillsPath)
      .filter((p): p is string => p !== null);

    if (paths.length === 0) return;

    let unlistenFn: (() => void) | null = null;
    let cancelled = false;

    // Start the watcher and subscribe to events in parallel.
    startFileWatcher(paths).catch((err: unknown) => {
      console.warn("[useFileWatcher] failed to start watcher:", err);
    });

    listen<SkillChangeEvent>("skill-changed", () => {
      if (!cancelled) {
        onRefetch();
      }
    }).then((unlisten) => {
      if (cancelled) {
        unlisten();
      } else {
        unlistenFn = unlisten;
      }
    });

    return () => {
      cancelled = true;
      unlistenFn?.();
    };
  }, [agents, onRefetch]);
}
