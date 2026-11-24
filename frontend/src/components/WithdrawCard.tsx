"use client";

import React, { useState } from "react";
import { ArrowUpIcon } from "./Icons";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { solToLamports } from "../lib/solana";

interface WithdrawCardProps {
  vaultBalanceLamports: bigint;
  maxWithdrawalLamports: bigint;
  isPaused: boolean;
  isLoading: boolean;
  onWithdraw: (amountSol: number) => Promise<unknown>;
}

export function WithdrawCard({
  vaultBalanceLamports,
  maxWithdrawalLamports,
  isPaused,
  isLoading,
  onWithdraw,
}: WithdrawCardProps) {
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const balanceSol = Number(vaultBalanceLamports) / LAMPORTS_PER_SOL;
  const maxLimitSol = Number(maxWithdrawalLamports) / LAMPORTS_PER_SOL;

  const handleSetMax = () => {
    const maxSafe = Math.min(balanceSol, maxLimitSol);
    setAmount(maxSafe.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Withdrawal amount must be strictly greater than 0 SOL.");
      return;
    }
    if (num > balanceSol) {
      setError(`Amount exceeds current vault balance (${balanceSol.toFixed(4)} SOL).`);
      return;
    }
    if (num > maxLimitSol) {
      setError(
        `Amount exceeds per-transaction cap (${maxLimitSol.toFixed(4)} SOL). Split into smaller transactions.`
      );
      return;
    }

    try {
      await onWithdraw(num);
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const lamportsPreview = amount ? solToLamports(amount) : BigInt(0);

  return (
    <div className="rounded-xl border border-[#1f2330] bg-[#11131a] p-5 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[#1f2330] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ArrowUpIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Withdraw SOL</h3>
          </div>
          <span className="font-mono text-xs text-zinc-400">
            Cap: <span className="text-zinc-200">{maxLimitSol.toFixed(4)} SOL</span>
          </span>
        </div>

        {isPaused && (
          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
            Vault is paused by owner. Withdrawals are currently disabled.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <div className="flex rounded-md border border-[#2d3245] bg-[#161822] focus-within:border-cyan-500">
              <input
                type="number"
                step="0.001"
                min="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPaused || isLoading || balanceSol === 0}
                className="w-full bg-transparent px-3 py-2 text-base font-mono text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSetMax}
                disabled={isPaused || isLoading || balanceSol === 0}
                className="btn-snappy px-2.5 text-[11px] font-mono font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-40"
              >
                MAX
              </button>
              <span className="flex items-center px-3 text-xs font-mono text-zinc-400 border-l border-[#2d3245]">
                SOL
              </span>
            </div>

            {lamportsPreview > 0 && (
              <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                ≈ {lamportsPreview.toString()} lamports returned to wallet
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPaused || isLoading || !amount || balanceSol === 0}
            className="btn-snappy w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-400 disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                <span>Withdrawing...</span>
              </>
            ) : (
              <span>Confirm Withdrawal</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
