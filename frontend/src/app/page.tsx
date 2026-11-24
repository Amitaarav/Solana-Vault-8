"use client";

import React from "react";
import { VaultProvider, useVaultContext } from "../context/VaultContext";
import {
  Header,
  VaultStats,
  InitializeVaultCard,
  DepositCard,
  WithdrawCard,
  SecurityControlsCard,
  ActivityLog,
  Alert,
  Button,
} from "../components";
import { PROGRAM_ID } from "../lib/constants";

function VaultDashboardContent() {
  const {
    cluster,
    setCluster,
    wallet,
    vault,
    notification,
    activityLog,
    refreshAll,
  } = useVaultContext();

  const isWalletReady = wallet.isMounted && wallet.publicKey !== null;

  return (
    <div className="flex min-h-screen flex-col bg-[#090a0f] text-zinc-100">
      <Header
        cluster={cluster}
        onClusterChange={setCluster}
        walletAddress={wallet.isMounted ? wallet.publicKey : null}
        walletBalanceSol={wallet.balanceSol}
        onConnectWallet={() => {}}
        onDisconnectWallet={wallet.generateNewWallet}
        onRefresh={refreshAll}
        isRefreshing={vault.isRefreshing}
      />

      <main className="mx-auto flex-1 w-full max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {/* Banner Alert */}
        {notification.notification && (
          <Alert
            type={notification.notification.type}
            message={notification.notification.message}
            onClose={notification.dismiss}
          />
        )}

        {/* Test Wallet Dev Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1f2330] bg-[#11131a] px-4 py-2.5 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span>
              Connected as Dev Wallet:{" "}
              <code className="font-mono text-zinc-200">
                {isWalletReady ? wallet.publicKey!.toBase58() : "Loading wallet..."}
              </code>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(cluster === "localnet" || cluster === "devnet") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => wallet.airdrop(2.0)}
                isLoading={wallet.isLoading}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              >
                + Airdrop 2 SOL
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={wallet.generateNewWallet}
            >
              New Keypair
            </Button>
          </div>
        </div>

        {/* Primary Vault Stats */}
        <VaultStats
          vault={vault.vault}
          vaultPda={vault.vaultPda}
          owner={wallet.publicKey}
          isInitialized={vault.isInitialized}
          isLoading={vault.isRefreshing}
        />

        {/* Main Content: If Uninitialized, show Initialize flow; otherwise show operations */}
        {!vault.isInitialized ? (
          <InitializeVaultCard
            onInitialize={vault.initialize}
            isLoading={vault.isLoading}
          />
        ) : (
          <div className="space-y-6">
            {/* Action Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DepositCard
                walletBalanceSol={wallet.balanceSol}
                isPaused={vault.vault?.paused ?? false}
                isLoading={vault.isLoading}
                onDeposit={vault.deposit}
              />
              <WithdrawCard
                vaultBalanceLamports={vault.vault?.balance ?? BigInt(0)}
                maxWithdrawalLamports={vault.vault?.maxWithdrawal ?? BigInt(0)}
                isPaused={vault.vault?.paused ?? false}
                isLoading={vault.isLoading}
                onWithdraw={vault.withdraw}
              />
            </div>

            {/* Security Controls */}
            <SecurityControlsCard
              isPaused={vault.vault?.paused ?? false}
              vaultBalanceLamports={vault.vault?.balance ?? BigInt(0)}
              isLoading={vault.isLoading}
              onTogglePause={vault.togglePause}
              onCloseVault={vault.closeVault}
            />
          </div>
        )}

        {/* Activity & Audit Trail */}
        <ActivityLog
          activities={activityLog.activities}
          cluster={cluster}
          onClear={activityLog.clear}
        />
      </main>

      <footer className="mt-auto border-t border-[#1f2330] bg-[#0c0e15] px-4 py-4 text-center text-xs text-zinc-500">
        <p>
          Solana Vault Program ID:{" "}
          <span className="font-mono text-zinc-400">{PROGRAM_ID.toBase58()}</span>
        </p>
      </footer>
    </div>
  );
}

export default function VaultDashboardPage() {
  return (
    <VaultProvider>
      <VaultDashboardContent />
    </VaultProvider>
  );
}
