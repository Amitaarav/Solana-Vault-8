import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { VaultAccount } from "../types/vault";
import {
  getVaultPDA,
  decodeVaultAccount,
  createInitializeInstruction,
  createDepositInstruction,
  createWithdrawInstruction,
  createSetPausedInstruction,
  createCloseVaultInstruction,
  parseTransactionError,
} from "../lib/solana";
import { PROGRAM_ID } from "../lib/constants";

/**
 * Service Pattern: Encapsulates all Solana Web3 interactions,
 * transaction creation, signing, confirmation, and error mapping.
 */
export class VaultService {
  /**
   * Fetch and decode the on-chain Vault account data
   */
  static async fetchVaultState(
    connection: Connection,
    vaultPda: PublicKey
  ): Promise<VaultAccount | null> {
    try {
      const accountInfo = await connection.getAccountInfo(vaultPda);
      if (!accountInfo || !accountInfo.data) {
        return null;
      }
      return decodeVaultAccount(accountInfo.data);
    } catch (err) {
      console.warn("Failed to fetch/decode vault account:", err);
      return null;
    }
  }

  /**
   * Fetch SOL balance for any public key
   */
  static async fetchBalanceSol(
    connection: Connection,
    pubkey: PublicKey
  ): Promise<number> {
    const lamports = await connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Build, sign, send, and confirm a Solana transaction
   */
  private static async sendTx(
    connection: Connection,
    signer: Keypair,
    instruction: any
  ): Promise<string> {
    try {
      const tx = new Transaction().add(instruction);
      const signature = await sendAndConfirmTransaction(connection, tx, [signer], {
        commitment: "confirmed",
      });
      return signature;
    } catch (err) {
      const parsed = parseTransactionError(err);
      throw new Error(parsed);
    }
  }

  /**
   * Initialize a new personal vault
   */
  static async initializeVault(
    connection: Connection,
    owner: Keypair,
    maxWithdrawalLamports: bigint
  ): Promise<string> {
    const ix = createInitializeInstruction(owner.publicKey, maxWithdrawalLamports, PROGRAM_ID);
    return this.sendTx(connection, owner, ix);
  }

  /**
   * Deposit lamports into the vault
   */
  static async depositSol(
    connection: Connection,
    depositor: Keypair,
    vaultOwner: PublicKey,
    amountLamports: bigint
  ): Promise<string> {
    const ix = createDepositInstruction(
      depositor.publicKey,
      vaultOwner,
      amountLamports,
      PROGRAM_ID
    );
    return this.sendTx(connection, depositor, ix);
  }

  /**
   * Withdraw lamports from the vault
   */
  static async withdrawSol(
    connection: Connection,
    owner: Keypair,
    amountLamports: bigint
  ): Promise<string> {
    const ix = createWithdrawInstruction(owner.publicKey, amountLamports, PROGRAM_ID);
    return this.sendTx(connection, owner, ix);
  }

  /**
   * Toggle emergency pause circuit breaker
   */
  static async setPaused(
    connection: Connection,
    owner: Keypair,
    paused: boolean
  ): Promise<string> {
    const ix = createSetPausedInstruction(owner.publicKey, paused, PROGRAM_ID);
    return this.sendTx(connection, owner, ix);
  }

  /**
   * Close vault account and reclaim rent
   */
  static async closeVault(
    connection: Connection,
    owner: Keypair
  ): Promise<string> {
    const ix = createCloseVaultInstruction(owner.publicKey, PROGRAM_ID);
    return this.sendTx(connection, owner, ix);
  }

  /**
   * Request airdrop of test SOL (Localnet / Devnet)
   */
  static async requestAirdrop(
    connection: Connection,
    recipient: PublicKey,
    amountSol = 2.0
  ): Promise<string> {
    try {
      const sig = await connection.requestAirdrop(recipient, amountSol * LAMPORTS_PER_SOL);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature: sig,
        ...latestBlockhash,
      });
      return sig;
    } catch (err) {
      throw new Error(`Airdrop failed: ${parseTransactionError(err)}`);
    }
  }
}
