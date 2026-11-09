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

**Fix**
- Marked the vault account mutable.
- Used checked arithmetic.
- Added validation for zero-value deposits.
- Used Anchor's typed System Program CPI helper.

**Tests**
- Verify actual lamports transferred.
- Verify stored vault balance.
- Verify invalid deposits are rejected.

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

**Design decisions**

- `vault.balance` represents deposited funds and excludes the rent-exempt reserve.
- Only the vault owner can withdraw.
- Partial and full withdrawals are permitted.
- The vault account remains allocated after a full withdrawal; closing it will be handled separately in Part 2.

**Tests**

- Successful withdrawal verifies both actual lamport reduction and internal balance updates.
- Withdrawal exceeding the recorded balance is rejected.
- Non-owner withdrawal is rejected by account validation.
- Failed withdrawal leaves the recorded balance unchanged.

## 3. Part 2 — Additional Features

To be documented after implementation.

## 4. Design Decisions

To be documented as features are implemented.

## 5. Test Results

To be updated after running the complete test suite.