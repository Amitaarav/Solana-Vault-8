import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { assert } from "chai";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program<Vault>;

  it("initializes a vault", async () => {
    const owner = provider.wallet.publicKey;
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize()
      .accounts({
        vault: vaultPda,
        owner,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.equal(vaultAccount.owner.toBase58(), owner.toBase58());
    assert.equal(vaultAccount.balance.toNumber(), 0);
  });

  // TODO (candidate): add tests covering:
  // - deposit actually increases the vault balance and the on-chain lamport balance
  it("deposits SOL into the vault", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(1_000_000) // 0.001 SOL

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
    
    await program.methods 
          .deposit(amount)
          .accounts({
            vault: vaultPda,
            depositor: owner,
            systemProgram: anchor.web3.SystemProgram.programId
          })
          .rpc();
    
    const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
    
    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.equal(
      vaultBalanceAfter - vaultBalanceBefore,
      amount.toNumber()
    );

    assert.equal(
      vaultAccount.balance.toNumber(),
      amount.toNumber()
    );
    
  });
  // - withdraw actually decreases the vault balance and pays out the owner
  // - withdraw fails cleanly when called by someone who isn't the vault owner
  // - withdraw fails cleanly when amount > current balance (no panics)
  // - any Part 2 features you implement (close_vault, events, withdrawal limit, pause, etc.)
});
