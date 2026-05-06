/**
 * useSimulationsCache
 *
 * Fetches the user's simulations exactly ONCE per login session.
 * Subsequent calls (from Simulations page, Reports page, Advisory page)
 * read from the Zustand cache — no extra DB round-trips.
 *
 * Cache is invalidated on logout and when a simulation is deleted.
 * Pass `forceRefresh = true` to bypass the cache (e.g. after a new simulation completes).
 */
import { useEffect, useState } from "react";
import { useAuthStore, useSimulationStore } from "../store/store";
import { getUserSimulations, getUserUUID } from "../services/simulationService";

interface UseSimulationsCacheResult {
  simulations: any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSimulationsCache(
  options: { onlyCompleted?: boolean; forceRefresh?: boolean } = {},
): UseSimulationsCacheResult {
  const user = useAuthStore((s) => s.user);
  const cachedSimulations = useSimulationStore((s) => s.cachedSimulations);
  const cachedUserId = useSimulationStore((s) => s.cachedSimulationsUserId);
  const setCachedSimulations = useSimulationStore((s) => s.setCachedSimulations);
  const invalidateSimulationsCache = useSimulationStore((s) => s.invalidateSimulationsCache);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const userId = user?.authUserId ?? null;

  useEffect(() => {
    if (!userId) return;

    // Cache hit — same user, data already loaded, no force refresh
    if (
      !options.forceRefresh &&
      cachedSimulations !== null &&
      cachedUserId === userId
    ) {
      return;
    }

    let cancelled = false;
    const fetch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userUUID = await getUserUUID(userId);
        if (!userUUID) {
          if (!cancelled) setError("User profile not found.");
          return;
        }
        const response = await getUserSimulations(userUUID);
        if (cancelled) return;
        if (response.success && response.data) {
          setCachedSimulations(response.data.simulations || [], userId);
        } else {
          setError(response.error || "Failed to load simulations.");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Unknown error.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshTick]);

  const allSims = cachedSimulations ?? [];
  const simulations = options.onlyCompleted
    ? allSims.filter((s) => s.status === "completed")
    : allSims;

  const refresh = () => {
    invalidateSimulationsCache();
    setRefreshTick((t) => t + 1);
  };

  return { simulations, isLoading, error, refresh };
}
