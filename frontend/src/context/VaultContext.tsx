"use client";

import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import { Connection } from "@solana/web3.js";
import { NetworkCluster, VaultActionType } from "../types/vault";
import { CLUSTERS } from "../lib/constants";
import { useWallet } from "../hooks/useWallet";
import { useVault } from "../hooks/useVault";
import { useActivityLog } from "../hooks/useActivityLog";
import { useNotification } from "../hooks/useNotification";

export interface VaultContextType {
  cluster: NetworkCluster;
  setCluster: (cluster: NetworkCluster) => void;
  clusterConfig: (typeof CLUSTERS)[NetworkCluster];
  connection: Connection;
  wallet: ReturnType<typeof useWallet>;
  vault: ReturnType<typeof useVault>;
  activityLog: ReturnType<typeof useActivityLog>;
  notification: ReturnType<typeof useNotification>;
  refreshAll: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export interface VaultProviderProps {
  children: React.ReactNode;
  defaultCluster?: NetworkCluster;
}

export const VaultProvider: React.FC<VaultProviderProps> = ({
  children,
  defaultCluster = "localnet",
}) => {
  const [cluster, setCluster] = useState<NetworkCluster>(defaultCluster);

  const clusterConfig = useMemo(() => CLUSTERS[cluster], [cluster]);

  const connection = useMemo(() => {
    return new Connection(clusterConfig.endpoint, "confirmed");
  }, [clusterConfig.endpoint]);

  const notification = useNotification(6000);
  const activityLog = useActivityLog();

  const wallet = useWallet(connection);

  const handleActionSuccess = useCallback(
    (action: string, sig: string, amount?: bigint) => {
      activityLog.logSuccess(action as VaultActionType, sig, amount);
      notification.success(
        `Action "${action.toUpperCase()}" confirmed on ${clusterConfig.name}.`
      );
    },
    [activityLog, notification, clusterConfig.name]
  );

  const handleActionError = useCallback(
    (action: string, error: string, amount?: bigint) => {
      activityLog.logFailure(action as VaultActionType, error, amount);
      notification.error(error);
    },
    [activityLog, notification]
  );

  const vault = useVault({
    connection,
    keypair: wallet.keypair,
    onSuccess: handleActionSuccess,
    onError: handleActionError,
    onBalanceChange: wallet.refreshBalance,
  });

  const refreshAll = useCallback(async () => {
    await Promise.all([wallet.refreshBalance(), vault.refresh()]);
  }, [wallet, vault]);

  const value: VaultContextType = {
    cluster,
    setCluster,
    clusterConfig,
    connection,
    wallet,
    vault,
    activityLog,
    notification,
    refreshAll,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
};

export function useVaultContext(): VaultContextType {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVaultContext must be used within a <VaultProvider>");
  }
  return context;
}
