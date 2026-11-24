import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Vault } from "../target/types/vault";
import { assert } from "chai";

describe("vault", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program<Vault>;

  const eventParser = new anchor.EventParser(
    program.programId,
    program.coder
  );

  it("initializes a vault", async () => {
    const owner = provider.wallet.publicKey;
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new anchor.BN(3_000_000_000))
      .accounts({
        vault: vaultPda,
        owner,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.equal(vaultAccount.owner.toBase58(), owner.toBase58());
    assert.equal(vaultAccount.balance.toNumber(), 0);
    assert.equal(
      vaultAccount.maxWithdrawal.toNumber(),
      3_000_000_000
    )
  });

  it("deposits SOL into the vault", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(1_000_000); // 0.001 SOL

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    const vaultBalanceBefore = await provider.connection.getBalance(vaultPda);
    
    const signature = await program.methods 
          .deposit(amount)
          .accounts({
            vault: vaultPda,
            depositor: owner,
            systemProgram: anchor.web3.SystemProgram.programId
          })
          .rpc();
    await provider.connection.confirmTransaction(
      signature,
      "confirmed"
    );
    
    const vaultBalanceAfter = await provider.connection.getBalance(vaultPda);
    
    const vaultAccount = await program.account.vault.fetch(vaultPda);

    const tx = await provider.connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,

    });
    
    assert.isNotNull(tx);
    assert.isNotNull(tx.meta);

    const events = [...eventParser.parseLogs(tx.meta.logMessages ?? [])];

    const depositEvent = events.find(
      (event) => event.name === "depositEvent"
    );

    assert.exists(depositEvent, "depositEvent should be emitted");

    assert.equal(
      depositEvent.data.owner.toBase58(),
      owner.toBase58()
    );

    assert.equal(
      depositEvent.data.amount.toNumber(),
      amount.toNumber()
    );

    assert.equal(
      depositEvent.data.balance.toNumber(),
      amount.toNumber()
    );

    assert.equal(
      vaultBalanceAfter - vaultBalanceBefore,
      amount.toNumber()
    );

    assert.equal(
      vaultAccount.balance.toNumber(),
      amount.toNumber()
    );
    
  });

  it("withdraws SOL from the vault", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(400_000);

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    const vaultBalanceBefore =
      await provider.connection.getBalance(vaultPda);

    const signature = await program.methods
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
      
    await provider.connection.confirmTransaction(
      signature,
      "confirmed"
    );

    const tx = await provider.connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if(!tx?.meta){
      throw new Error("Transaction metadata or logs not found")
    }

    const events = [
      ...eventParser.parseLogs(tx.meta.logMessages ?? [])
    ];

    const withdrawEvent = events.find(
      (event) => event.name === "withdrawEvent"
    )

    assert.exists(withdrawEvent, "withdrawEvent should be emitted");

    assert.equal(
      withdrawEvent.data.owner.toBase58(),
      owner.toBase58()
    );

    assert.equal(
      withdrawEvent.data.amount.toNumber(),
      amount.toNumber()
    );

    assert.equal(
      withdrawEvent.data.balance.toNumber(),
      600_000
    );
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

  it("rejects zero-value withdrawal", async () => {
    const owner = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .withdraw(new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          owner,
        })
        .rpc();

      assert.fail("Expected zero-value withdrawal to fail");
    } catch (error) {
      assert.include(String(error), "ZeroAmount");
    }
  });

  // Rejects closing a non-empty vault
  it("rejects closing a vault with non-zero balance", async()=>{
    const owner = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    )
    const balanceBefore = await program.account.vault.fetch(vaultPda);

    try{
      await program.methods
        .closeVault()
        .accounts({
          vault: vaultPda,
          owner
        })
        .rpc();

        assert.fail("Expected closing a non-empty vault to fail");

    }catch(error){
      assert.include(String(error), "NonZeroBalance");
    }

    const balanceAfter = await program.account.vault.fetch(vaultPda);

    assert.equal(
      balanceAfter.balance.toNumber(),
      balanceBefore.balance.toNumber()
    );
  });


  it("closes an empty vault and reclaims rent", async () => {
    // Create a fresh owner to avoid the provider wallet's huge balance.
    const owner = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      owner.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction(
      {
        signature: airdropSignature,
        ...latestBlockhash,
      },
      "confirmed"
    );

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new anchor.BN(3_000_000_000))
      .accounts({
        vault: vaultPda,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.equal(vaultAccount.balance.toNumber(), 0);

    const vaultLamportsBefore =
      await provider.connection.getBalance(vaultPda);

    const ownerLamportsBefore =
      await provider.connection.getBalance(owner.publicKey);

    await program.methods
      .closeVault()
      .accounts({
        vault: vaultPda,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    const ownerLamportsAfter =
      await provider.connection.getBalance(owner.publicKey);

    const vaultAccountAfter =
      await provider.connection.getAccountInfo(vaultPda);

    assert.isNull(vaultAccountAfter, "Vault account should no longer exist");

    // The provider wallet pays the transaction fee.
    // Therefore, the owner should receive all vault lamports.
    assert.equal(
      ownerLamportsAfter - ownerLamportsBefore,
      vaultLamportsBefore,
      "Owner should receive all remaining vault lamports"
    );
  });

  it("rejects withdrawal exceeding the maximum withdrawal limit", async () => {
    const owner = provider.wallet.publicKey;
    const amount = new anchor.BN(3_000_000_001);
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .withdraw(amount)
        .accounts({
          vault: vaultPda,
          owner,
        })
        .rpc();

      assert.fail("Expected withdrawal limit validation to fail");
    } catch (error) {
      assert.include(String(error), "WithdrawalLimitExceeded");
    }

    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.equal(vaultAccount.balance.toNumber(), 600_000);
  })

  it("allows withdrawal exactly equal to the maximum withdrawal limit", async () => {
    const owner = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      owner.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );

    await provider.connection.confirmTransaction(
      airdropSignature,
      "confirmed"
    );

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initialize(new anchor.BN(3_000_000_000))
      .accounts({
        vault: vaultPda,
        owner: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .deposit(new anchor.BN(4_000_000_000))
      .accounts({
        vault: vaultPda,
        depositor: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([owner])
      .rpc();

    await program.methods
      .withdraw(new anchor.BN(3_000_000_000))
      .accounts({
        vault: vaultPda,
        owner: owner.publicKey,
      })
      .signers([owner])
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.equal(vaultAccount.balance.toNumber(), 1_000_000_000);
  });

  it("rejects initialization with zero maximum withdrawal", async () => {
    const owner = anchor.web3.Keypair.generate();

    const airdropSignature = await provider.connection.requestAirdrop(
      owner.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );

    const latestBlockhash = await provider.connection.getLatestBlockhash();

    await provider.connection.confirmTransaction(
      {
        signature: airdropSignature,
        ...latestBlockhash,
      },
      "confirmed"
    );

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .initialize(new anchor.BN(0))
        .accounts({
          vault: vaultPda,
          owner: owner.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([owner])
        .rpc();

      assert.fail("Expected initialization with zero maximum withdrawal to fail");
    } catch (error) {
      assert.include(String(error), "InvalidMaxWithdrawal");
    }

    const vaultAccount = await provider.connection.getAccountInfo(vaultPda);
    assert.isNull(vaultAccount, "Vault should not be initialized");
  });

  it("allows the owner to pause the vault", async () => {
  const owner = provider.wallet.publicKey;

  const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    program.programId
  );

  await program.methods
    .setPaused(true)
    .accounts({ vault: vaultPda, owner })
    .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.isTrue(vaultAccount.paused);
  });

  it("rejects deposits when the vault is paused", async () => {
    const owner = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .deposit(new anchor.BN(100_000))
        .accounts({
          vault: vaultPda,
          depositor: owner,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Expected deposit to fail while paused");
    } catch (error) {
      assert.include(String(error), "VaultPaused");
    }
  });

  it("rejects withdrawals when the vault is paused", async () => {
    const owner = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .withdraw(new anchor.BN(100_000))
        .accounts({ vault: vaultPda, owner })
        .rpc();

      assert.fail("Expected withdrawal to fail while paused");
    } catch (error) {
      assert.include(String(error), "VaultPaused");
    }
  });

  it("allows the owner to resume the vault", async () => {
    const owner = provider.wallet.publicKey;

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    await program.methods
      .setPaused(false)
      .accounts({ vault: vaultPda, owner })
      .rpc();

    const vaultAccount = await program.account.vault.fetch(vaultPda);

    assert.isFalse(vaultAccount.paused);
  });

  it("rejects pause attempts by a non-owner", async () => {
    const owner = provider.wallet.publicKey;
    const attacker = anchor.web3.Keypair.generate();

    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .setPaused(true)
        .accounts({
          vault: vaultPda,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();

      assert.fail("Non-owner should not be able to pause the vault");
    } catch (error) {
      assert.include(String(error), "ConstraintSeeds");
    }

    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.isFalse(vaultAccount.paused);
  });
});
