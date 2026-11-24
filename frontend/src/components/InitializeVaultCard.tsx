"use client";

import React, { useState } from "react";
import { VaultShieldIcon } from "./Icons";

interface InitializeVaultCardProps {
  onInitialize: (maxWithdrawalSol: number) => Promise<unknown>;
  isLoading: boolean;
}

export function InitializeVaultCard({
  onInitialize,
  isLoading,
}: InitializeVaultCardProps) {
  const [maxWithdrawal, setMaxWithdrawal] = useState<string>("1.0");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(maxWithdrawal);
    if (isNaN(amount) || amount <= 0) {
      setError("Maximum withdrawal must be strictly greater than 0 SOL.");
      return;
    }

    try {
      await onInitialize(amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-[#11131a] p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
          <VaultShieldIcon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">Initialize Your Personal Vault</h3>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            Your wallet does not have an active vault PDA on this cluster. Initializing will deploy a deterministic
            account derived from your public key (<code className="text-zinc-300">[b&quot;vault&quot;, owner]</code>) with custom withdrawal safety limits.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300">
                Max Per-Transaction Withdrawal Limit (SOL)
              </label>
              <div className="mt-1.5 flex rounded-md border border-[#2d3245] bg-[#161822] focus-within:border-emerald-500">
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={maxWithdrawal}
                  onChange={(e) => setMaxWithdrawal(e.target.value)}
                  placeholder="e.g. 1.0"
                  className="w-full bg-transparent px-3 py-2 text-sm font-mono text-white placeholder-zinc-500 focus:outline-none"
                  disabled={isLoading}
                />
                <span className="flex items-center px-3 text-xs font-mono text-zinc-400 border-l border-[#2d3245]">
                  SOL
                </span>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Protective ceiling: individual withdrawals larger than this value will be automatically rejected on-chain.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-snappy w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent" />
                  <span>Creating Vault Account...</span>
                </>
              ) : (
                <span>Initialize Vault on Solana</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
