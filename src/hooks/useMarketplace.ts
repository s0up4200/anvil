import { useCallback, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { searchMarketplace } from "@/lib/tauri";
import { useMarketplaceStore } from "@/stores/marketplaceStore";
import { getErrorMessage } from "@/lib/utils";

/**
 * Provides marketplace search with debouncing, and listens for CLI availability events.
 */
export function useMarketplace() {
  const {
    results,
    query,
    isSearching,
    searchError,
    cliAvailable,
    setResults,
    setQuery,
    setIsSearching,
    setSearchError,
    setCliAvailable,
  } = useMarketplaceStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for CLI unavailable event from the background checker.
  useEffect(() => {
    const unlisten = listen("skills-cli-unavailable", () => {
      setCliAvailable(false);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setCliAvailable]);

  const search = useCallback(
    (q: string) => {
      setQuery(q);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!q.trim()) {
        setResults([]);
        setSearchError(null);
        return;
      }

      debounceRef.current = setTimeout(() => {
        setIsSearching(true);
        setSearchError(null);

        searchMarketplace(q)
          .then((res) => {
            setResults(res);
            setCliAvailable(true);
            setIsSearching(false);
          })
          .catch((err: unknown) => {
            setSearchError(getErrorMessage(err));
            setIsSearching(false);
          });
      }, 300);
    },
    [setQuery, setResults, setIsSearching, setSearchError, setCliAvailable],
  );

  return { results, query, isSearching, searchError, cliAvailable, search };
}
