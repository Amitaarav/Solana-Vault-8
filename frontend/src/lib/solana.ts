import { Buffer } from "buffer";
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { VaultAccount, NetworkCluster, VAULT_ERRORS } from "../types/vault";

// Ensure global Buffer is available in browser
if (typeof window !== "undefined") {
  (window as unknown as { Buffer: typeof Buffer }).Buffer =
    (window as unknown as { Buffer: typeof Buffer }).Buffer || Buffer;
}

export const PROGRAM_ID = new PublicKey(
  "12o36QLa5vizehVGtGd41hwHonLw66Vh56mH7xozniZy"
);

export const CLUSTERS: Record<NetworkCluster, { name: string; endpoint: string }> = {
  localnet: {
    name: "Localnet (127.0.0.1:8899)",
    endpoint: "http://127.0.0.1:8899",
  },
  devnet: {
    name: "Solana Devnet",
    endpoint: "https://api.devnet.solana.com",
  },
  "mainnet-beta": {
    name: "Mainnet Beta",
    endpoint: "https://api.mainnet-beta.solana.com",
  },
};

// Instruction discriminators (8-byte Anchor SHA256 discriminator hashes)
export const DISCRIMINATORS = {
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit: new Uint8Array([242, 35, 64, 198, 137, 82, 225, 242, 182]),
  withdraw: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
  setPaused: new Uint8Array([91, 60, 125, 173, 192, 176, 225, 166, 218]),
  closeVault: new Uint8Array([141, 103, 17, 126, 72, 75, 29, 29]),
  vaultAccount: new Uint8Array([211, 8, 232, 43, 2, 152, 117, 119]),
};

/**
 * Derive Vault PDA for an owner safely across browser and Node
 */
export function getVaultPDA(owner: PublicKey, programId = PROGRAM_ID): [PublicKey, number] {
  const seedPrefix = new TextEncoder().encode("vault");
  return PublicKey.findProgramAddressSync(
    [seedPrefix, owner.toBuffer()],
    programId
  );
}

/**
 * Parse raw account data safely using native DataView (works with both Uint8Array and Buffer)
 */
export function decodeVaultAccount(rawData: Uint8Array | Buffer): VaultAccount {
  const bytes = rawData instanceof Uint8Array ? rawData : new Uint8Array(rawData);
  if (bytes.length < 8 + 32 + 8 + 8 + 1 + 1) {
    throw new Error(`Invalid vault account data length: ${bytes.length} bytes (expected >= 58 bytes)`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  // Skip 8-byte discriminator
  let offset = 8;
  const ownerBytes = bytes.subarray(offset, offset + 32);
  const owner = new PublicKey(ownerBytes);
  offset += 32;

  const maxWithdrawal = view.getBigUint64(offset, true); // true = Little Endian
  offset += 8;

  const balance = view.getBigUint64(offset, true); // true = Little Endian
  offset += 8;

  const bump = view.getUint8(offset);
  offset += 1;

  const paused = view.getUint8(offset) !== 0;

  return {
    owner,
    maxWithdrawal,
    balance,
    bump,
    paused,
  };
}

/**
 * Build Initialize instruction
 */
export function createInitializeInstruction(
  owner: PublicKey,
  maxWithdrawalLamports: bigint,
  programId = PROGRAM_ID
): TransactionInstruction {
  const [vaultPda] = getVaultPDA(owner, programId);

  const payload = new Uint8Array(8 + 8);
  payload.set(DISCRIMINATORS.initialize, 0);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setBigUint64(8, maxWithdrawalLamports, true);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(payload),
  });
}

/**
 * Build Deposit instruction
 */
export function createDepositInstruction(
  depositor: PublicKey,
  vaultOwner: PublicKey,
  amountLamports: bigint,
  programId = PROGRAM_ID
): TransactionInstruction {
  const [vaultPda] = getVaultPDA(vaultOwner, programId);

  const payload = new Uint8Array(8 + 8);
  payload.set(DISCRIMINATORS.deposit, 0);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setBigUint64(8, amountLamports, true);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: depositor, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(payload),
  });
}

/**
 * Build Withdraw instruction
 */
export function createWithdrawInstruction(
  owner: PublicKey,
  amountLamports: bigint,
  programId = PROGRAM_ID
): TransactionInstruction {
  const [vaultPda] = getVaultPDA(owner, programId);

  const payload = new Uint8Array(8 + 8);
  payload.set(DISCRIMINATORS.withdraw, 0);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setBigUint64(8, amountLamports, true);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(payload),
  });
}

/**
 * Build SetPaused instruction
 */
export function createSetPausedInstruction(
  owner: PublicKey,
  paused: boolean,
  programId = PROGRAM_ID
): TransactionInstruction {
  const [vaultPda] = getVaultPDA(owner, programId);

  const payload = new Uint8Array(8 + 1);
  payload.set(DISCRIMINATORS.setPaused, 0);
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  view.setUint8(8, paused ? 1 : 0);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(payload),
  });
}

/**
 * Build CloseVault instruction
 */
export function createCloseVaultInstruction(
  owner: PublicKey,
  programId = PROGRAM_ID
): TransactionInstruction {
  const [vaultPda] = getVaultPDA(owner, programId);

  const payload = new Uint8Array(8);
  payload.set(DISCRIMINATORS.closeVault, 0);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
    ],
    data: Buffer.from(payload),
  });
}

/**
 * Map Solana Anchor errors into human explanations
 */
export function parseTransactionError(err: unknown): string {
  if (!err) return "Unknown error occurred.";

  const errStr = String(err);

  for (const [codeStr, details] of Object.entries(VAULT_ERRORS)) {
    if (
      errStr.includes(`custom program error: 0x${Number(codeStr).toString(16)}`) ||
      errStr.includes(`Error Code: ${details.name}`) ||
      errStr.includes(details.name) ||
      errStr.includes(`custom program error: ${codeStr}`)
    ) {
      return `${details.message} (${details.name})`;
    }
  }

  if (errStr.includes("User rejected the request")) {
    return "Transaction cancelled by wallet.";
  }
  if (errStr.includes("Attempt to debit an account but found no record")) {
    return "Account has not been funded yet.";
  }
  if (errStr.includes("insufficient funds for rent")) {
    return "Insufficient SOL to cover transaction fee or account rent.";
  }

  return (err as Error).message || errStr;
}

/**
 * Format lamports to SOL string
 */
export function formatLamports(lamports: bigint, precision = 4): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  });
}

/**
 * Parse SOL input to lamports bigint
 */
export function solToLamports(solAmount: number | string): bigint {
  const num = typeof solAmount === "string" ? parseFloat(solAmount) : solAmount;
  if (isNaN(num) || num <= 0) return BigInt(0);
  return BigInt(Math.round(num * LAMPORTS_PER_SOL));
}
