# Solana Non-Custodial Personal Vault

A security-first, non-custodial personal asset vault on Solana built with **Rust**, **Anchor (0.30.x)**, and a **Next.js & Tailwind CSS** frontend.

Designed with strict on-chain access controls, rate-limiting safeguards, emergency circuit breakers, rent-reserve preservation, and deterministic Program Derived Addresses (PDAs).

---

## 🌟 Key Features

- **Deterministic Personal Vault (PDA)**: Each vault account is deterministically derived from the owner's public key using seeds `[b"vault", owner.key()]`, ensuring a 1:1 trustless mapping with zero central custody.
- **Per-Transaction Withdrawal Limits**: Configurable per-transaction cap (`max_withdrawal`) enforced on-chain at execution time to protect user funds against drained sessions or unauthorized transfers.
- **Emergency Circuit Breaker (Pause/Resume)**: Vault owners can instantly pause and resume contract operations. While paused, all incoming deposits and outgoing withdrawals are atomically rejected on-chain.
- **Rent-Exempt Reserve Protection**: Direct lamport withdrawals strictly enforce retention of the account's rent-exempt minimum balance (`Rent::get()?.minimum_balance()`), preventing involuntary account purges by the Solana runtime.
- **Clean Decommissioning & Rent Reclamation**: Owners can permanently close their vault account when the deposited balance reaches zero, sweeping the rent-exempt reserve (~0.00146 SOL) back to their wallet.
- **Audited Arithmetic & Custom Errors**: Fully checked math (`checked_add`, `checked_sub`) across all lamport operations to protect against integer overflows/underflows, mapped to descriptive Anchor error codes.
- **On-Chain Event Streaming**: Emits typed Anchor events (`DepositEvent`, `WithdrawEvent`) on state changes, enabling real-time indexing by client apps and dApp explorers.
- **Modern UI / Frontend**: Responsive dashboard adhering to **Impeccable** craft principles and **Emil Kowalski's `animate`** motion standards.

---

## 📐 On-Chain Architecture & Account Layout

```
                                  +------------------------------------+
                                  |         Vault Owner Wallet         |
                                  +-----------------+------------------+
                                                    | (Signs)
                                                    v
+------------------+                    +-----------+-----------+
|  Depositor       |---(deposit SOL)--->|       VAULT PDA       |
|  (Any Signer)    |                    |  [b"vault", owner]    |
+------------------+                    +-----------+-----------+
                                                    | (withdraw SOL)
                                                    v
                                        +-----------+-----------+
                                        |  Owner Lamport Balance|
                                        +-----------------------+
```

### Account Layout (`Vault`)

The account memory layout is tightly packed and rent-optimized to exactly **58 bytes**:

| Field | Type | Size | Description |
|---|---|---|---|
| `discriminator` | `[u8; 8]` | 8 bytes | Anchor 8-byte SHA256 account discriminator |
| `owner` | `Pubkey` | 32 bytes | The public key of the vault owner |
| `max_withdrawal` | `u64` | 8 bytes | Maximum lamports allowed per withdrawal transaction |
| `balance` | `u64` | 8 bytes | Recorded deposited balance (excluding rent reserve) |
| `bump` | `u8` | 1 byte | PDA canonical bump seed |
| `paused` | `bool` | 1 byte | Circuit breaker state (`true` = frozen, `false` = active) |
| **Total Allocation** | | **58 bytes** | `8 + 32 + 8 + 8 + 1 + 1` |

---

## ⚙️ Instruction Specification

### 1. `initialize(max_withdrawal: u64)`
- **Accounts**:
  - `vault`: `[init, payer = owner, space = 58, seeds = [b"vault", owner], bump]`
  - `owner`: `[mut, Signer]`
  - `system_program`: `Program<'info, System>`
- **Validation**: Requires `max_withdrawal > 0` (`InvalidMaxWithdrawal`). Initializes `balance = 0` and `paused = false`.

### 2. `deposit(amount: u64)`
- **Accounts**:
  - `vault`: `[mut, seeds = [b"vault", vault.owner], bump = vault.bump]`
  - `depositor`: `[mut, Signer]`
  - `system_program`: `Program<'info, System>`
- **Validation**: Rejects `amount == 0` (`ZeroAmount`). Rejects if `paused == true` (`VaultPaused`).
- **Execution**: Transfers SOL from `depositor` to `vault` via System Program CPI. Updates `balance` using `.checked_add()`. Emits `DepositEvent`.

### 3. `withdraw(amount: u64)`
- **Accounts**:
  - `vault`: `[mut, seeds = [b"vault", owner], bump = vault.bump, has_one = owner]`
  - `owner`: `[mut, Signer]`
- **Validation**:
  - Rejects if `amount == 0` (`ZeroAmount`)
  - Rejects if `paused == true` (`VaultPaused`)
  - Rejects if `amount > vault.max_withdrawal` (`WithdrawalLimitExceeded`)
  - Rejects if `amount > vault.balance` (`InsufficientBalance`)
  - Rejects if `remaining_lamports < rent_minimum` (`InsufficientVaultFunds`)
- **Execution**: Debits `vault` lamports and credits `owner` lamports directly (as the vault is owned by the program). Updates `balance` using `.checked_sub()`. Emits `WithdrawEvent`.

### 4. `set_paused(paused: bool)`
- **Accounts**:
  - `vault`: `[mut, seeds = [b"vault", owner], bump = vault.bump, has_one = owner]`
  - `owner`: `Signer`
- **Validation**: Enforces `has_one = owner` and requires the owner's signature. Updates the `paused` flag.

### 5. `close_vault()`
- **Accounts**:
  - `vault`: `[mut, close = owner, seeds = [b"vault", owner], bump = vault.bump, has_one = owner]`
  - `owner`: `[mut, Signer]`
- **Validation**: Requires `vault.balance == 0` (`NonZeroBalance`), guaranteeing no deposited funds are accidentally burned. Anchor's `close = owner` sweeps all remaining rent lamports back to the owner and zeroes the account.

---

## 🔒 Security & Invariant Matrix

| Vector | Mitigation Mechanism |
|---|---|
| **Unauthorized Withdrawal** | `has_one = owner` + `Signer<'info>` + PDA derivation ensures only the verified owner can withdraw. |
| **Arithmetic Overflow/Underflow** | Checked arithmetic (`checked_add`, `checked_sub`) used on both internal balance and actual lamport balances. |
| **Rent Exemption Stripping** | Explicit check: `remaining_lamports >= rent_minimum` prevents account eviction. |
| **Account Re-initialization** | Anchor's `init` constraint verifies account creation via System Program, failing if the PDA already exists. |
| **Trapped Funds on Close** | `require!(ctx.accounts.vault.balance == 0)` ensures all deposited funds must be withdrawn prior to decommissioning. |
| **Flash Drains / Key Compromise** | Per-transaction withdrawal cap limits the immediate loss surface in compromised session scenarios. |

---

## 🧪 Test Suite Coverage

The comprehensive Mocha/Chai test suite (`tests/vault.ts`) validates end-to-end functionality:

```bash
yarn test
```

### Tested Scenarios:
1. `initializes a vault` — Verifies correct owner, initial 0 balance, max withdrawal limit, and PDA address derivation.
2. `deposits SOL into the vault` — Verifies CPI transfer, on-chain lamport increase, internal balance update, and `DepositEvent` emission.
3. `rejects zero-value deposits` — Asserts `ZeroAmount` (6000) error.
4. `permissionless deposits` — Confirms third-party depositors can fund the vault for the owner.
5. `withdraws SOL from the vault` — Verifies lamport deduction, owner payout, internal balance update, and `WithdrawEvent` emission.
6. `rejects zero-value withdrawals` — Asserts `ZeroAmount` (6000) error.
7. `rejects unauthorized withdrawals` — Confirms a non-owner signer cannot withdraw funds (`has_one` check).
8. `rejects withdrawals exceeding balance` — Asserts `InsufficientBalance` (6002) error.
9. `rejects withdrawals violating rent exemption` — Asserts `InsufficientVaultFunds` (6003) error.
10. `rejects withdrawals exceeding per-transaction cap` — Asserts `WithdrawalLimitExceeded` (6006) error.
11. `allows withdrawal exactly equal to cap` — Boundary test confirming exact-limit compliance.
12. `owner can pause the vault` — Validates pause state toggle and `has_one` signer check.
13. `rejects deposits while paused` — Asserts `VaultPaused` (6007) error.
14. `rejects withdrawals while paused` — Asserts `VaultPaused` (6007) error.
15. `owner can resume the vault` — Confirms normal operations resume once unpaused.
16. `close_vault rejects non-zero balance` — Asserts `NonZeroBalance` (6004) error.
17. `close_vault succeeds at zero balance` — Verifies account closure, rent sweep, and account deallocation.

---

## 💻 Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Rust 2021, Anchor Framework `0.30.1` |
| **Blockchain** | Solana (SBF / BPF) |
| **Client & Tests** | TypeScript, `@coral-xyz/anchor`, `@solana/web3.js`, Mocha, Chai |
| **Frontend** | Next.js 15, Tailwind CSS, TypeScript |
| **Design System** | Impeccable Design Guidelines (`Operate` Mode), Emil Kowalski Animation Specs |

---

## 🚀 Getting Started

### Prerequisites
- [Rust (stable)](https://rustup.rs/)
- [Solana CLI (v1.18+)](https://docs.solanalabs.com/cli/install)
- [Anchor CLI (0.30.x)](https://www.anchor-lang.com/docs/installation)
- [Node.js (18+)](https://nodejs.org/) & `yarn`

### 1. Build the Solana Program
```bash
# Clone the repository
git clone https://github.com/your-username/solana-vault.git
cd solana-vault

# Install dependencies
yarn install

# Compile the Anchor program
anchor build
```

### 2. Run the Test Suite
```bash
# Runs the full test suite against local validator
anchor test
```

### 3. Deploy to Solana Devnet
```bash
# Point CLI to Devnet
solana config set --url https://api.devnet.solana.com

# Fund your deployer keypair
solana airdrop 2

# Deploy the compiled program
solana program deploy target/deploy/vault.so --program-id target/deploy/vault-keypair.json
```

### 4. Run the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser to interact with the vault on Devnet, Localnet, or Mainnet.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
