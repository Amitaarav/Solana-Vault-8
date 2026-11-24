"use client";

import React, { useState } from "react";
import { PauseIcon, PlayIcon, TrashIcon, AlertCircleIcon } from "./Icons";

interface SecurityControlsCardProps {
  isPaused: boolean;
  vaultBalanceLamports: bigint;
  isLoading: boolean;
  onTogglePause: () => Promise<unknown>;
  onCloseVault: () => Promise<unknown>;
}

export function SecurityControlsCard({
  isPaused,
  vaultBalanceLamports,
  isLoading,
  onTogglePause,
  onCloseVault,
}: SecurityControlsCardProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasBalance = vaultBalanceLamports > BigInt(0);

  const handleClose = async () => {
    setError(null);
    if (hasBalance) {
      setError("Cannot close vault while balance is non-zero. Withdraw all SOL first.");
      return;
    }

    try {
      await onCloseVault();
      setConfirmClose(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-xl border border-[#1f2330] bg-[#11131a] p-5 shadow-md">
      <div className="flex items-center justify-between border-b border-[#1f2330] pb-3">
        <h3 className="text-sm font-semibold text-white">Security &amp; Lifecycle Controls</h3>
        <span className="text-[11px] font-mono text-zinc-500">has_one = owner</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Pause / Resume */}
        <div className="rounded-lg border border-[#1f2330] bg-[#161822] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">Emergency Circuit Breaker</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  isPaused
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {isPaused ? "PAUSED" : "ACTIVE"}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              When paused, all incoming deposits and outgoing withdrawals are instantly rejected on-chain.
            </p>
          </div>

          <button
            onClick={onTogglePause}
            disabled={isLoading}
            className={`btn-snappy mt-4 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              isPaused
                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                : "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            } disabled:opacity-50`}
          >
            {isPaused ? (
              <>
                <PlayIcon className="h-3.5 w-3.5" />
                <span>Resume Vault Activity</span>
              </>
            ) : (
              <>
                <PauseIcon className="h-3.5 w-3.5" />
                <span>Pause Vault Activity</span>
              </>
            )}
          </button>
        </div>

        {/* Close Vault */}
        <div className="rounded-lg border border-[#1f2330] bg-[#161822] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">Decommission Vault</span>
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                Rent Reclaim
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Permanently close the vault PDA account and sweep rent-exempt reserve lamports back to your wallet.
            </p>
            {hasBalance && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
                <AlertCircleIcon className="h-3.5 w-3.5 shrink-0" />
                <span>Requires 0.00 SOL balance to close</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            {!confirmClose ? (
              <button
                onClick={() => setConfirmClose(true)}
                disabled={isLoading || hasBalance}
                className="btn-snappy w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20 disabled:opacity-40"
              >
                <TrashIcon className="h-3.5 w-3.5" />
                <span>Close Vault Account</span>
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={isLoading}
                  className="btn-snappy flex-1 rounded-lg bg-rose-500 px-3 py-2 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                >
                  Confirm Reclaim
                </button>
                <button
                  onClick={() => setConfirmClose(false)}
                  className="btn-snappy rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
}
