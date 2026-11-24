import { useState, useCallback } from "react";
import { VaultActivityItem, VaultActionType } from "../types/vault";

export function useActivityLog() {
  const [activities, setActivities] = useState<VaultActivityItem[]>([]);

  const logSuccess = useCallback(
    (type: VaultActionType, signature: string, amount?: bigint) => {
      setActivities((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          amount,
          signature,
          timestamp: Date.now(),
          status: "confirmed",
        },
        ...prev,
      ]);
    },
    []
  );

  const logFailure = useCallback(
    (type: VaultActionType, error: string, amount?: bigint) => {
      setActivities((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          type,
          amount,
          error,
          timestamp: Date.now(),
          status: "failed",
        },
        ...prev,
      ]);
    },
    []
  );

  const clear = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    logSuccess,
    logFailure,
    clear,
  };
}
