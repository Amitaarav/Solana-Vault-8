import { useState, useEffect, useCallback } from "react";
import { Connection, Keypair } from "@solana/web3.js";
import { VaultService } from "../services/vault.service";

const STORAGE_KEY = "solana_vault_dev_keypair";

export function useWallet(connection: Connection) {
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Initialize or restore session keypair
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const secret = JSON.parse(stored);
        setKeypair(Keypair.fromSecretKey(new Uint8Array(secret)));
      } else {
        const kp = Keypair.generate();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)));
        setKeypair(kp);
      }
    } catch {
      setKeypair(Keypair.generate());
    }
  }, []);

  // Fetch current wallet SOL balance
  const refreshBalance = useCallback(async () => {
    if (!keypair) return;
    try {
      const bal = await VaultService.fetchBalanceSol(connection, keypair.publicKey);
      setBalanceSol(bal);
    } catch (err) {
      console.warn("Could not fetch wallet balance:", err);
    }
  }, [connection, keypair]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Generate and switch to a fresh keypair
  const generateNewWallet = useCallback(() => {
    const kp = Keypair.generate();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(kp.secretKey)));
    } catch {
      // ignore
    }
    setKeypair(kp);
    setBalanceSol(null);
    return kp;
  }, []);

  // Request test SOL airdrop
  const airdrop = useCallback(
    async (amountSol = 2.0) => {
      if (!keypair) throw new Error("No active wallet.");
      setIsLoading(true);
      try {
        const sig = await VaultService.requestAirdrop(
          connection,
          keypair.publicKey,
          amountSol
        );
        await refreshBalance();
        return sig;
      } finally {
        setIsLoading(false);
      }
    },
    [connection, keypair, refreshBalance]
  );

  return {
    keypair,
    publicKey: keypair?.publicKey ?? null,
    balanceSol,
    isLoading,
    isMounted,
    refreshBalance,
    generateNewWallet,
    airdrop,
  };
}
