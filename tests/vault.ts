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

  it("withdraws SOL from the vault", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(400_000);

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    const vaultBalanceBefore =
      await provider.connection.getBalance(vaultPda);

    await program.methods
      .withdraw(amount)
      .accounts({
        vault: vaultPda,
        owner,
      })
      .rpc();

    const vaultBalanceAfter =
      await provider.connection.getBalance(vaultPda);

    const vaultAccount =
      await program.account.vault.fetch(vaultPda);

    assert.equal(
      vaultBalanceBefore - vaultBalanceAfter,
      amount.toNumber()
    );

    assert.equal(
      vaultAccount.balance.toNumber(),
      600_000
    );
  });

  it("rejects withdrawal exceeding the vault balance", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(700_000);

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    let failed = false;

    try {
      await program.methods
        .withdraw(amount)
        .accounts({
          vault: vaultPda,
          owner,
        })
        .rpc();
    } catch (error) {
      failed = true;
      assert.include(String(error), "InsufficientBalance");
    }

    assert.isTrue(failed, "Withdrawal should have failed");

    const vaultAccount =
      await program.account.vault.fetch(vaultPda);

    assert.equal(vaultAccount.balance.toNumber(), 600_000);
  });

  it("rejects withdrawal by a non-owner", async () => {
    const owner = provider.wallet.publicKey;
    const attacker = anchor.web3.Keypair.generate();

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    const airdropSignature = await provider.connection.requestAirdrop(
      attacker.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(
      airdropSignature,
      "confirmed"
    );

    let failed = false;

    try {
      await program.methods
        .withdraw(new anchor.BN(100_000))
        .accounts({
          vault: vaultPda,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
    } catch (error) {
      failed = true;
      assert.include(String(error), "ConstraintSeeds");
    }

    assert.isTrue(failed, "Non-owner withdrawal should have failed");
  });
  // - withdraw fails cleanly when called by someone who isn't the vault owner
  // - withdraw fails cleanly when amount > current balance (no panics)
  // - any Part 2 features you implement (close_vault, events, withdrawal limit, pause, etc.)
});
