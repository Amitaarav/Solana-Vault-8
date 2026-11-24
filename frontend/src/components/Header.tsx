"use client";

import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { VaultShieldIcon, WalletIcon, RefreshIcon } from "./Icons";
import { CLUSTERS } from "../lib/solana";
import { NetworkCluster } from "../types/vault";

interface HeaderProps {
  cluster: NetworkCluster;
  onClusterChange: (c: NetworkCluster) => void;
  walletAddress: PublicKey | null;
  walletBalanceSol: number | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function Header({
  cluster,
  onClusterChange,
  walletAddress,
  walletBalanceSol,
  onConnectWallet,
  onDisconnectWallet,
  onRefresh,
  isRefreshing,
}: HeaderProps) {
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  const formatShortAddress = (addr: PublicKey) => {
    const s = addr.toBase58();
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#1f2330] bg-[#0c0e15]/95 backdrop-blur-md px-4 py-3 sm:px-6 shadow-md transition-all duration-150">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2d3245] bg-[#141724] text-emerald-400">
            <VaultShieldIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-100 tracking-tight">SOLANA VAULT</span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-400 border border-emerald-500/20">
                ANCHOR 0.30
              </span>
            </div>
            <p className="text-xs text-zinc-400">Non-custodial personal asset vault</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh action */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh vault & wallet state"
            className="btn-snappy flex h-8 w-8 items-center justify-center rounded-md border border-[#24293b] bg-[#141724] text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50"
          >
            <RefreshIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          {/* Network Selector */}
          <div className="relative">
            <button
              onClick={() => setShowNetworkMenu(!showNetworkMenu)}
              className="btn-snappy flex h-8 items-center gap-2 rounded-md border border-[#24293b] bg-[#141724] px-2.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  cluster === "localnet"
                    ? "bg-emerald-400 ring-2 ring-emerald-500/20"
                    : cluster === "devnet"
                    ? "bg-cyan-400 ring-2 ring-cyan-500/20"
                    : "bg-purple-400 ring-2 ring-purple-500/20"
                }`}
              />
              <span className="font-medium">{CLUSTERS[cluster].name}</span>
            </button>

            {showNetworkMenu && (
              <div
                className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-[#24293b] bg-[#141724] py-1 shadow-xl"
                onMouseLeave={() => setShowNetworkMenu(false)}
              >
                {(Object.keys(CLUSTERS) as NetworkCluster[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      onClusterChange(key);
                      setShowNetworkMenu(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                      cluster === key
                        ? "bg-[#1f2438] text-white font-medium"
                        : "text-zinc-400 hover:bg-[#1a1e30] hover:text-zinc-200"
                    }`}
                  >
                    <span>{CLUSTERS[key].name}</span>
                    {cluster === key && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Wallet Connection */}
          {walletAddress ? (
            <div className="flex items-center gap-2 rounded-md border border-[#2d3348] bg-[#141724] px-3 py-1">
              <div className="text-right">
                <div className="font-mono text-xs text-zinc-200">{formatShortAddress(walletAddress)}</div>
                {walletBalanceSol !== null && (
                  <div className="font-mono text-[10px] text-zinc-400">
                    {walletBalanceSol.toFixed(3)} SOL
                  </div>
                )}
              </div>
              <button
                onClick={onDisconnectWallet}
                title="Disconnect wallet"
                className="btn-snappy ml-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
              >
                Exit
              </button>
            </div>
          ) : (
            <button
              onClick={onConnectWallet}
              className="btn-snappy flex h-8 items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50"
            >
              <WalletIcon className="h-4 w-4" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
