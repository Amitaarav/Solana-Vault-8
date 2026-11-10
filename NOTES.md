# Vault Program — Implementation Notes

## 1. Overview

This document describes the identified issues, security implications, fixes, and design decisions made while improving the Solana Vault program.

## 2. Part 1 — Bug Fixes

### 2.1 Deposit Instruction

**Original issue**
- Vault account was not marked mutable.
- Balance was updated using unchecked arithmetic.
- Zero-value deposits were accepted.

**Production risk**
- Account modification could fail due to incorrect account privileges.
- Arithmetic overflow could cause unexpected transaction failures.
- Zero-value transactions consume resources without meaningful deposits.
- Without checked addition, a sufficiently large deposit could cause an arithmetic overflow in the recorded balance.

**Fix**
- Marked the vault account mutable.
- Used checked arithmetic.
- Added validation for zero-value deposits.
- Used Anchor's typed System Program CPI helper.
- Deposits are permissionless: any signer can deposit  SOL into an existing vault; the depositor does not need to be the vault owner.
- The vault PDA is validated using the stored owner's public key and the stored bump.
- The recorded balance is updated only after the System Program transfer succeeds.

**Tests**
- Verify actual lamports transferred.
- Verify stored vault balance.
- Verify invalid deposits are rejected.
- Verify that the DepositEvent contains the correct vault owner, deposited amount, and resulting balance.

## 2.2 Withdrawal Instruction

**Original issues**

- The withdrawal instruction did not verify that the signer owned the vault.
- The vault PDA was not validated against the owner's public key.
- The stored balance was reduced using unchecked subtraction.
- Zero-value withdrawals were accepted.
- Actual vault lamports could be reduced without preserving the rent-exempt reserve.

**Production risks**

- Unauthorized users could potentially attempt withdrawals from another user's vault.
- Invalid account relationships could lead to incorrect account handling.
- Insufficient-balance withdrawals could cause arithmetic failures.
- Spending the rent-exempt reserve could make the vault account non-rent-exempt.

**Fixes**

- Added PDA seed and bump validation to the `Withdraw` account context.
- Added `has_one = owner` to enforce the stored ownership relationship.
- Used `checked_sub()` to validate the requested withdrawal against the recorded balance.
- Added zero-amount validation.
- Checked actual vault lamports and preserved the rent-exempt minimum.
- Used checked arithmetic when calculating the recipient's resulting lamport balance.
- Updated vault accounting only after all validations and lamport transfers succeed.
- Calculated the owner's resulting lamport balance using `checked_add()` to prevent arithmetic overflow.
- Used direct lamport mutation because the vault account is owned by the program; this avoids requiring PDA signing for a System Program transfer.
- Ensured the withdrawal amount is deducted from both actual vault lamports and the recorded balance.

**Design decisions**

- `vault.balance` represents deposited funds and excludes the rent-exempt reserve.
- Only the vault owner can withdraw.
- Partial and full withdrawals are permitted.
- The vault account remains allocated after a full withdrawal; closing it will be handled separately in Part 2.
- The recorded `vault.balance` tracks deposited funds and excludes the rent-exempt reserve.
- The vault account remains open after its recorded balance reaches zero.
- The withdrawal instruction preserves the rent-exempt minimum required by the vault account.

**Tests**

- Successful withdrawal verifies both actual lamport reduction and internal balance updates.
- Withdrawal exceeding the recorded balance is rejected.
- Non-owner withdrawal is rejected by account validation.
- Failed withdrawal leaves the recorded balance unchanged.

## 3. Part 2 — Additional Feature

### 3.1 Close Vault Instruction

### Design Decision: Zero-Balance Closure vs. Sweep-and-Close

Two approaches were considered for closing the vault.

**Approach 1: Close only when the deposited balance is zero (Implemented)**

- The owner must withdraw all deposited SOL before closing the vault.
- The `close_vault` instruction checks that `vault.balance == 0`.
- Anchor's `close = owner` constraint automatically transfers the remaining lamports (rent reserve) to the owner and closes the account.
- Withdrawal and account closure remain separate responsibilities.

**Approach 2: Sweep-and-Close (Alternative)**

- The owner can close the vault even when it contains deposited SOL.
- The remaining lamports are transferred to the owner as part of the closure.
- Withdrawal and account closure happen in a single transaction.
- This is more convenient but combines fund withdrawal and account lifecycle management.

**Why Approach 1 Was Preferred**

- **Separation of concerns:** Withdrawal handles deposited funds, while closure handles account lifecycle and rent reclamation.
- **Predictability:** Closing a vault cannot unexpectedly withdraw deposited funds.
- **Simplicity:** The implementation and tests are easier to reason about.
- **Explicit ownership of funds:** The owner must deliberately withdraw funds before closing the vault.

**Trade-off:** The owner may need two transactions: one to withdraw all deposited funds and another to close the vault.

**Final Decision:** The vault can only be closed when its recorded deposited balance is zero. This approach provides predictable behavior and keeps withdrawal and closure responsibilities separate.

## 3.2 — Deposit and Withdrawal Events

### Requirement

Emit on-chain events whenever SOL is deposited into or withdrawn from a vault.

Each event contains:
- `owner`: Public key of the vault owner.
- `amount`: Amount deposited or withdrawn in lamports.
- `balance`: Resulting vault balance after the operation.

### Implementation Approach

- Defined `DepositEvent` and `WithdrawEvent` using Anchor's `#[event]` macro.
- Used Anchor's `emit!` macro to emit events from the respective instructions.
- Events are emitted after successfully updating the vault's recorded balance.
- Included the vault owner's public key to identify the vault associated with each event.

### Event Flow

**Deposit:**
1. Validate the deposit amount.
2. Transfer SOL into the vault.
3. Update the recorded vault balance.
4. Emit `DepositEvent`.

**Withdrawal:**
1. Validate the withdrawal amount and available balance.
2. Transfer SOL to the owner.
3. Update the recorded vault balance.
4. Emit `WithdrawEvent`.

### Testing

- Verified that `DepositEvent` is emitted.
- Verified that `WithdrawEvent` is emitted.
- Checked the event owner public key.
- Checked the transaction amount.
- Checked the resulting vault balance.
- Parsed transaction logs using Anchor's `EventParser`.

### Important Note

Anchor exposes event names in camelCase through its TypeScript event parser:
- `DepositEvent` → `depositEvent`
- `WithdrawEvent` → `withdrawEvent`

Events are emitted through transaction logs and do not create additional account storage.

**Result:** Both deposit and withdrawal event implementations compile successfully, and all tests pass.

## 3.3 — Maximum Withdrawal Limit

### Requirement
Configure a maximum withdrawal amount when initializing a vault and reject any individual withdrawal exceeding that limit.

### Implementation
- Added `max_withdrawal: u64` to the `Vault` account.
- Updated account allocation to accommodate the additional 8-byte field.
- Updated the `initialize` instruction to accept and store the maximum withdrawal amount.
- Added validation to reject zero maximum withdrawal during initialization.
- Added withdrawal validation to reject amounts exceeding the configured limit.
- Introduced two custom errors:
  - `InvalidMaxWithdrawal`
  - `WithdrawalLimitExceeded`

### Design Decision
The maximum withdrawal is a per-transaction limit, not a cumulative lifetime limit.

For example, with a maximum withdrawal of 3 SOL:
- A withdrawal of 2 SOL is allowed.
- A withdrawal of exactly 3 SOL is allowed.
- A withdrawal of 3 SOL + 1 lamport is rejected.
- Multiple withdrawals are allowed as long as each individual withdrawal respects the limit and sufficient vault funds are available.

### Tests
1. Reject withdrawal exceeding the configured maximum.
2. Allow withdrawal exactly equal to the configured maximum.
3. Reject initialization with zero maximum withdrawal.
4. Verify the vault balance remains unchanged after rejected withdrawals.

**Result:** All 11 tests in the current suite pass.

## 3.4 — Pause and Resume Vault

### Requirement
Allow the vault owner to pause and resume vault operations. While paused, deposits and withdrawals must be rejected.

### Implementation
- Added `paused: bool` to the `Vault` account.
- Updated account allocation to 58 bytes, including the 8-byte Anchor discriminator.
- Initialized new vaults with `paused = false`.
- Implemented the `set_paused` instruction to allow the owner to pause or resume the vault.
- Validated ownership using PDA seeds, bump, and `has_one = owner`.
- Added `VaultPaused` as a custom error.
- Added pause-state validation to both `deposit` and `withdraw`.

### Design Decisions
- Used a single `set_paused(bool)` instruction instead of separate pause and resume instructions.
- Only the vault owner can change the pause state.
- Deposits and withdrawals are blocked while paused.
- Other operations, such as closing an empty vault, remain available while paused.

### Tests
1. Owner can pause the vault.
2. Deposits are rejected while paused.
3. Withdrawals are rejected while paused.
4. Owner can resume the vault.
5. Non-owner cannot pause the vault.
6. Vault state remains unchanged after an unauthorized pause attempt.

**Result:** All 16 tests in the current suite pass.

## 4. Overall Verification
- All implemented Part 1 bug fixes and Part 2 features were tested using the Anchor test suite.
- The tests verify account ownership, PDA validation, SOL transfers, balance accounting, rent preservation, event emission, withdrawal limits, account closure, and pause/resume behavior.
- Final test result: 16 tests passing, 0 failing.
- The program was tested against a local Solana validator using anchor test --skip-local-validator.