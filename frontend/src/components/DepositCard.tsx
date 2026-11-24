"use client";

import React, { useState } from "react";
import { ArrowDownIcon } from "./Icons";
import { solToLamports } from "../lib/solana";

interface DepositCardProps {
  walletBalanceSol: number | null;
  isPaused: boolean;
  isLoading: boolean;
  onDeposit: (amountSol: number) => Promise<unknown>;
}

export function DepositCard({
  walletBalanceSol,
  isPaused,
  isLoading,
  onDeposit,
}: DepositCardProps) {
  const [amount, setAmount] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const presets = [0.1, 0.5, 1.0, 2.0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) {
      setError("Deposit amount must be strictly greater than 0 SOL.");
      return;
    }
    if (walletBalanceSol !== null && num > walletBalanceSol) {
      setError(`Amount exceeds your available wallet balance (${walletBalanceSol.toFixed(3)} SOL).`);
      return;
    }

    try {
      await onDeposit(num);
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
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-white">Deposit SOL</h3>
          </div>
          {walletBalanceSol !== null && (
            <span className="font-mono text-xs text-zinc-400">
              Wallet: <span className="text-zinc-200">{walletBalanceSol.toFixed(3)} SOL</span>
            </span>
          )}
        </div>

        {isPaused && (
          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
            Vault is paused by owner. Deposits are currently disabled.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <div className="flex rounded-md border border-[#2d3245] bg-[#161822] focus-within:border-emerald-500">
              <input
                type="number"
                step="0.001"
                min="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={isPaused || isLoading}
                className="w-full bg-transparent px-3 py-2 text-base font-mono text-white placeholder-zinc-500 focus:outline-none"
              />
              <span className="flex items-center px-3 text-xs font-mono text-zinc-400 border-l border-[#2d3245]">
                SOL
              </span>
            </div>

            {/* Quick preset increments */}
            <div className="mt-2 flex gap-1.5">
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={isPaused || isLoading}
                  onClick={() => setAmount(val.toString())}
                  className="btn-snappy rounded border border-[#24293b] bg-[#161822] px-2 py-1 text-[11px] font-mono text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-40"
                >
                  +{val} SOL
                </button>
              ))}
            </div>

            {lamportsPreview > 0 && (
              <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                ≈ {lamportsPreview.toString()} lamports transferred to PDA
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
            disabled={isPaused || isLoading || !amount}
            className="btn-snappy w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
          >
            {isLoading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                <span>Depositing...</span>
              </>
            ) : (
              <span>Confirm Deposit</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
