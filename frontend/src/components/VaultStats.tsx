"use client";

import React, { useState } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { VaultAccount } from "../types/vault";
import { formatLamports, PROGRAM_ID } from "../lib/solana";
import { LockIcon, UnlockIcon, CopyIcon, CheckCircleIcon } from "./Icons";

interface VaultStatsProps {
  vault: VaultAccount | null;
  vaultPda: PublicKey | null;
  owner: PublicKey | null;
  isInitialized: boolean;
  isLoading: boolean;
}

export function VaultStats({
  vault,
  vaultPda,
  owner,
  isInitialized,
  isLoading,
}: VaultStatsProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const balanceSol = vault ? Number(vault.balance) / LAMPORTS_PER_SOL : 0;
  const maxWithdrawalSol = vault ? Number(vault.maxWithdrawal) / LAMPORTS_PER_SOL : 0;

  return (
    <div className="rounded-xl border border-[#1f2330] bg-[#11131a] p-5 shadow-lg">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2330] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">Vault Balance</h2>
            {isLoading ? (
              <span className="inline-block h-2 w-2 animate-ping rounded-full bg-cyan-400" />
            ) : isInitialized ? (
              vault?.paused ? (
                <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">
                  <LockIcon className="h-3 w-3" /> Paused
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  <UnlockIcon className="h-3 w-3" /> Active
                </span>
              )
            ) : (
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400 border border-zinc-700">
                Not Initialized
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {isInitialized && vault ? balanceSol.toFixed(4) : "0.0000"}
            </span>
            <span className="text-sm font-medium text-zinc-400">SOL</span>
          </div>
          {isInitialized && vault && (
            <p className="font-mono text-xs text-zinc-500 mt-0.5">
              {vault.balance.toString()} lamports
            </p>
          )}
        </div>

        {/* Cap & Security stats */}
        <div className="flex flex-wrap gap-3 sm:gap-6">
          <div className="rounded-lg border border-[#1f2330] bg-[#161822] p-3 min-w-[140px]">
            <span className="text-[11px] font-medium uppercase text-zinc-400">Max Withdrawal / Tx</span>
            <div className="mt-0.5 font-mono text-base font-semibold text-zinc-200">
              {isInitialized && vault ? `${maxWithdrawalSol.toFixed(4)} SOL` : "—"}
            </div>
            <span className="text-[10px] text-zinc-500">Per-transaction limit</span>
          </div>

          <div className="rounded-lg border border-[#1f2330] bg-[#161822] p-3 min-w-[140px]">
            <span className="text-[11px] font-medium uppercase text-zinc-400">PDA Bump</span>
            <div className="mt-0.5 font-mono text-base font-semibold text-cyan-400">
              {isInitialized && vault ? vault.bump : "—"}
            </div>
            <span className="text-[10px] text-zinc-500">Seed: [b&quot;vault&quot;, owner]</span>
          </div>
        </div>
      </div>

      {/* Account Address Strip */}
      <div className="mt-4 grid grid-cols-1 gap-2 pt-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {/* Vault PDA */}
        <div className="flex items-center justify-between rounded-md bg-[#161822] px-3 py-2 border border-[#1f2330]">
          <div className="truncate">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Vault PDA</span>
            <span className="font-mono text-zinc-300">
              {vaultPda ? `${vaultPda.toBase58().slice(0, 8)}...${vaultPda.toBase58().slice(-8)}` : "—"}
            </span>
          </div>
          {vaultPda && (
            <button
              onClick={() => copyToClipboard(vaultPda.toBase58(), "pda")}
              className="text-zinc-400 hover:text-white p-1"
              title="Copy Vault PDA"
            >
              {copiedKey === "pda" ? (
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Program ID */}
        <div className="flex items-center justify-between rounded-md bg-[#161822] px-3 py-2 border border-[#1f2330]">
          <div className="truncate">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Program ID</span>
            <span className="font-mono text-zinc-300">
              {`${PROGRAM_ID.toBase58().slice(0, 6)}...${PROGRAM_ID.toBase58().slice(-6)}`}
            </span>
          </div>
          <button
            onClick={() => copyToClipboard(PROGRAM_ID.toBase58(), "prog")}
            className="text-zinc-400 hover:text-white p-1"
            title="Copy Program ID"
          >
            {copiedKey === "prog" ? (
              <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* Owner Pubkey */}
        <div className="flex items-center justify-between rounded-md bg-[#161822] px-3 py-2 border border-[#1f2330]">
          <div className="truncate">
            <span className="text-zinc-500 text-[10px] uppercase font-mono block">Connected Owner</span>
            <span className="font-mono text-zinc-300">
              {owner ? `${owner.toBase58().slice(0, 6)}...${owner.toBase58().slice(-6)}` : "Not connected"}
            </span>
          </div>
          {owner && (
            <button
              onClick={() => copyToClipboard(owner.toBase58(), "owner")}
              className="text-zinc-400 hover:text-white p-1"
              title="Copy Owner Pubkey"
            >
              {copiedKey === "owner" ? (
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
