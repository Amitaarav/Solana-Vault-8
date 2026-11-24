import { PublicKey } from "@solana/web3.js";

export type NetworkCluster = "devnet" | "localnet" | "mainnet-beta";

export interface VaultAccount {
  owner: PublicKey;
  maxWithdrawal: bigint; // in lamports
  balance: bigint; // in lamports
  bump: number;
  paused: boolean;
}

export type VaultActionType =
  | "initialize"
  | "deposit"
  | "withdraw"
  | "pause"
  | "unpause"
  | "close";

export interface VaultActivityItem {
  id: string;
  type: VaultActionType;
  amount?: bigint;
  balanceAfter?: bigint;
  signature?: string;
  timestamp: number;
  status: "confirmed" | "failed";
  error?: string;
}

export interface ProgramErrorDetails {
  code: number;
  name: string;
  message: string;
}

export interface NotificationState {
  type: "success" | "error" | "info";
  message: string;
}

export const VAULT_ERRORS: Record<number, ProgramErrorDetails> = {
  6000: {
    code: 6000,
    name: "ZeroAmount",
    message: "Deposit or withdrawal amount must be greater than zero.",
  },
  6001: {
    code: 6001,
    name: "ArithmeticOverflow",
    message: "An arithmetic overflow occurred during computation.",
  },
  6002: {
    code: 6002,
    name: "InsufficientBalance",
    message: "Requested amount exceeds the vault's deposited balance.",
  },
  6003: {
    code: 6003,
    name: "InsufficientVaultFunds",
    message: "Withdrawal rejected: account must retain minimum rent-exempt reserve.",
  },
  6004: {
    code: 6004,
    name: "NonZeroBalance",
    message: "Cannot close vault while funds remain. Withdraw all SOL first.",
  },
  6005: {
    code: 6005,
    name: "InvalidMaxWithdrawal",
    message: "Maximum per-transaction withdrawal must be strictly greater than zero.",
  },
  6006: {
    code: 6006,
    name: "WithdrawalLimitExceeded",
    message: "Requested withdrawal exceeds the configured per-transaction cap.",
  },
  6007: {
    code: 6007,
    name: "VaultPaused",
    message: "The vault is currently paused by the owner. Transactions are blocked.",
  },
};
