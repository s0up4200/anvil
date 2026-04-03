import { create } from "zustand"
import { fetchLeaderboard } from "@/lib/tauri"
import type { LeaderboardSkill } from "@/types"

export type Tab = "all" | "trending" | "hot"

const STALE_MS = 5 * 60 * 1000 // 5 minutes

interface LeaderboardState {
  data: Record<Tab, LeaderboardSkill[]>
  loading: Record<Tab, boolean>
  error: Record<Tab, string | null>
  fetchedAt: number | null
}

interface LeaderboardActions {
  fetchAll: () => void
}

const TABS: Tab[] = ["all", "trending", "hot"]

export const useLeaderboardStore = create<LeaderboardState & LeaderboardActions>()(
  (set, get) => ({
    data: { all: [], trending: [], hot: [] },
    loading: { all: false, trending: false, hot: false },
    error: { all: null, trending: null, hot: null },
    fetchedAt: null,

    fetchAll: () => {
      const { fetchedAt, loading } = get()
      const now = Date.now()

      // Skip if already loading or data is fresh
      if (loading.all || loading.trending || loading.hot) return
      if (fetchedAt && now - fetchedAt < STALE_MS) return

      set({
        fetchedAt: now,
        loading: { all: true, trending: true, hot: true },
        error: { all: null, trending: null, hot: null },
      })

      for (const tab of TABS) {
        fetchLeaderboard(tab)
          .then((skills) => {
            set((s) => ({
              data: { ...s.data, [tab]: skills },
              loading: { ...s.loading, [tab]: false },
            }))
          })
          .catch((e) => {
            set((s) => ({
              error: { ...s.error, [tab]: String(e) },
              loading: { ...s.loading, [tab]: false },
            }))
          })
      }
    },
  }),
)
