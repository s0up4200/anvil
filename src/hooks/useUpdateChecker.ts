import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { checkSkillUpdates } from "@/lib/tauri";
import { useUpdateStore } from "@/stores/updateStore";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import { getErrorMessage } from "@/lib/utils";
import type { SkillUpdate } from "@/types";

/**
 * Listens for background update check events and provides a manual check function.
 */
export function useUpdateChecker() {
  const {
    pendingUpdates,
    lastChecked,
    isChecking,
    checkError,
    setPendingUpdates,
    setLastChecked,
    setIsChecking,
    setCheckError,
  } = useUpdateStore();

  const setCliAvailable = useMarketplaceStore((s) => s.setCliAvailable);

  // Listen for background checker results.
  useEffect(() => {
    const unlistenUpdates = listen<SkillUpdate[]>(
      "skill-updates-available",
      (event) => {
        setPendingUpdates(event.payload);
        setLastChecked(new Date().toISOString());
      },
    );

    const unlistenCli = listen("skills-cli-unavailable", () => {
      setCliAvailable(false);
    });

    return () => {
      unlistenUpdates.then((fn) => fn());
      unlistenCli.then((fn) => fn());
    };
  }, [setPendingUpdates, setLastChecked, setCliAvailable]);

  const checkNow = useCallback(() => {
    setIsChecking(true);
    setCheckError(null);

    checkSkillUpdates()
      .then((updates) => {
        setPendingUpdates(updates);
        setLastChecked(new Date().toISOString());
        setIsChecking(false);
      })
      .catch((err: unknown) => {
        setCheckError(getErrorMessage(err));
        setIsChecking(false);
      });
  }, [setPendingUpdates, setLastChecked, setIsChecking, setCheckError]);

  return { pendingUpdates, lastChecked, isChecking, checkError, checkNow };
}
