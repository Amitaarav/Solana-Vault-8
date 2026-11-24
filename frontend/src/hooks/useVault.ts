import { useState, useCallback, useEffect, useMemo } from "react";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { VaultAccount } from "../types/vault";
import { VaultService } from "../services/vault.service";
import { getVaultPDA, solToLamports } from "../lib/solana";

interface UseVaultProps {
  connection: Connection;
  keypair: Keypair | null;
  onSuccess?: (action: string, sig: string, amount?: bigint) => void;
  onError?: (action: string, err: string, amount?: bigint) => void;
  onBalanceChange?: () => void;
}

export function useVault({
  connection,
  keypair,
  onSuccess,
  onError,
  onBalanceChange,
}: UseVaultProps) {
  const [vault, setVault] = useState<VaultAccount | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const ownerPubkey = keypair ? keypair.publicKey : null;

  // Memoized PDA derivation
  const vaultPda = useMemo(() => {
    if (!ownerPubkey) return null;
    return getVaultPDA(ownerPubkey)[0];
  }, [ownerPubkey]);

  // Fetch account data
  const refresh = useCallback(async () => {
    if (!vaultPda) {
      setVault(null);
      setIsInitialized(false);
      return;
    }

    setIsRefreshing(true);
    try {
      const account = await VaultService.fetchVaultState(connection, vaultPda);
      if (account) {
        setVault(account);
        setIsInitialized(true);
      } else {
        setVault(null);
        setIsInitialized(false);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [connection, vaultPda]);

  // Auto-refresh on keypair or cluster change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Execute transaction wrapper with feedback
  const execute = async (
    actionName: "initialize" | "deposit" | "withdraw" | "pause" | "unpause" | "close",
    task: () => Promise<string>,
    amountLamports?: bigint
  ) => {
    if (!keypair) throw new Error("Wallet not connected.");
    setIsLoading(true);

    try {
      const sig = await task();
      await refresh();
      onBalanceChange?.();
      onSuccess?.(actionName, sig, amountLamports);
      return sig;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onError?.(actionName, msg, amountLamports);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const initialize = useCallback(
    async (maxWithdrawalSol: number) => {
      if (!keypair) return;
      const lamports = solToLamports(maxWithdrawalSol);
      return execute(
        "initialize",
        () => VaultService.initializeVault(connection, keypair, lamports),
        lamports
      );
    },
    [connection, keypair]
  );

  const deposit = useCallback(
    async (amountSol: number) => {
      if (!keypair || !ownerPubkey) return;
      const lamports = solToLamports(amountSol);
      return execute(
        "deposit",
        () => VaultService.depositSol(connection, keypair, ownerPubkey, lamports),
        lamports
      );
    },
    [connection, keypair, ownerPubkey]
  );

  const withdraw = useCallback(
    async (amountSol: number) => {
      if (!keypair) return;
      const lamports = solToLamports(amountSol);
      return execute(
        "withdraw",
        () => VaultService.withdrawSol(connection, keypair, lamports),
        lamports
      );
    },
    [connection, keypair]
  );

  const togglePause = useCallback(async () => {
    if (!keypair || !vault) return;
    const nextState = !vault.paused;
    const action = nextState ? "pause" : "unpause";
    return execute(action, () =>
      VaultService.setPaused(connection, keypair, nextState)
    );
  }, [connection, keypair, vault]);

  const closeVault = useCallback(async () => {
    if (!keypair) return;
    const res = await execute("close", () =>
      VaultService.closeVault(connection, keypair)
    );
    setIsInitialized(false);
    setVault(null);
    return res;
  }, [connection, keypair]);

  return {
    vault,
    vaultPda,
    isInitialized,
    isLoading,
    isRefreshing,
    refresh,
    initialize,
    deposit,
    withdraw,
    togglePause,
    closeVault,
  };
}
