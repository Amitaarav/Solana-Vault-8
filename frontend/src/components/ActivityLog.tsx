"use client";

import React, { useState } from "react";
import { VaultActivityItem, NetworkCluster } from "../types/vault";
import { formatLamports } from "../lib/solana";
import { CheckCircleIcon, AlertCircleIcon } from "./Icons";

interface ActivityLogProps {
  activities: VaultActivityItem[];
  cluster: NetworkCluster;
  onClear: () => void;
}

export function ActivityLog({ activities, cluster, onClear }: ActivityLogProps) {
  const [filter, setFilter] = useState<"all" | "deposit" | "withdraw" | "admin">("all");

  const filtered = activities.filter((item) => {
    if (filter === "all") return true;
    if (filter === "deposit") return item.type === "deposit";
    if (filter === "withdraw") return item.type === "withdraw";
    if (filter === "admin")
      return item.type === "initialize" || item.type === "pause" || item.type === "unpause" || item.type === "close";
    return true;
  });

  const getExplorerUrl = (signature: string) => {
    const clusterParam =
      cluster === "devnet" ? "?cluster=devnet" : cluster === "localnet" ? "?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899" : "";
    return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
  };

  return (
    <div className="rounded-xl border border-[#1f2330] bg-[#11131a] p-5 shadow-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#1f2330] pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Activity Log &amp; Event Stream</h3>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
            {activities.length} entries
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {(["all", "deposit", "withdraw", "admin"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn-snappy rounded px-2.5 py-1 text-xs capitalize ${
                filter === f
                  ? "bg-[#252a3d] text-white font-medium"
                  : "text-zinc-400 hover:bg-[#1a1e2d] hover:text-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
          {activities.length > 0 && (
            <button
              onClick={onClear}
              className="ml-2 text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 divide-y divide-[#1b1e2a]">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No activity recorded in this session yet.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
              <div className="flex items-center gap-2.5">
                {item.status === "confirmed" ? (
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircleIcon className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold uppercase tracking-wide text-zinc-200">
                      {item.type}
                    </span>
                    {item.amount && (
                      <span className="font-mono text-zinc-300 font-medium">
                        {item.type === "withdraw" ? "-" : "+"}
                        {formatLamports(item.amount)} SOL
                      </span>
                    )}
                  </div>
                  {item.error ? (
                    <span className="text-[11px] text-rose-400">{item.error}</span>
                  ) : item.signature ? (
                    <a
                      href={getExplorerUrl(item.signature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-cyan-400 hover:underline"
                    >
                      Tx: {item.signature.slice(0, 8)}...{item.signature.slice(-6)}
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-[10px] text-zinc-500">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
                {item.balanceAfter !== undefined && (
                  <div className="font-mono text-[10px] text-zinc-400">
                    Bal: {formatLamports(item.balanceAfter)} SOL
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
