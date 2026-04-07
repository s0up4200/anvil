import { useCallback, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { checkSkillUpdates } from "@/lib/tauri";
import { useUpdateStore } from "@/stores/updateStore";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import { getErrorMessage } from "@/lib/utils";
import type { SkillCheckResult } from "@/types";

/**
 * Listens for background update check events and provides a manual check function.
 */
export function useUpdateChecker() {
  const {
    pendingUpdates,
    skippedSkills,
    lastChecked,
    isChecking,
    checkError,
    setPendingUpdates,
    setSkippedSkills,
    setLastChecked,
    setIsChecking,
    setCheckError,
  } = useUpdateStore();

  const setCliAvailable = useMarketplaceStore((s) => s.setCliAvailable);

  // Listen for background checker results.
  useEffect(() => {
    const unlistenUpdates = listen<SkillCheckResult>(
      "skill-updates-available",
      (event) => {
        setPendingUpdates(event.payload.updates);
        setSkippedSkills(event.payload.skippedSkills);
        setLastChecked(new Date().toISOString());
        setCheckError(null);
      },
    );

    const unlistenCli = listen("skills-cli-unavailable", () => {
      setCliAvailable(false);
    });

    const unlistenErrors = listen<string>("skill-update-check-error", (event) => {
      setCheckError(event.payload);
    });

    return () => {
      unlistenUpdates.then((fn) => fn());
      unlistenCli.then((fn) => fn());
      unlistenErrors.then((fn) => fn());
    };
  }, [setPendingUpdates, setSkippedSkills, setLastChecked, setCheckError, setCliAvailable]);

  const checkNow = useCallback(() => {
    setIsChecking(true);
    setCheckError(null);

    checkSkillUpdates()
      .then((result) => {
        setPendingUpdates(result.updates);
        setSkippedSkills(result.skippedSkills);
        setLastChecked(new Date().toISOString());
        setIsChecking(false);
      })
      .catch((err: unknown) => {
        setCheckError(getErrorMessage(err));
        setIsChecking(false);
      });
  }, [setPendingUpdates, setSkippedSkills, setLastChecked, setIsChecking, setCheckError]);

  return { pendingUpdates, skippedSkills, lastChecked, isChecking, checkError, checkNow };
}
