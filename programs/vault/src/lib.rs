use anchor_lang::prelude::*;

declare_id!("12o36QLa5vizehVGtGd41hwHonLw66Vh56mH7xozniZy");

#[program]
pub mod vault {
    use super::*;

    /// Creates a personal vault PDA for the calling owner.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.balance = 0;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// Deposits `amount` lamports from the depositor into their vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {

        // rejects zero-value deposits
        require!(amount > 0, VaultError::ZeroAmount);

        // calculate new balance and check for overflow
        let new_balance = ctx.accounts.vault
                            .balance
                            .checked_add(amount)
                            .ok_or(VaultError::ArithmeticOverflow)?;

        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.depositor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        };

        // anchor_lang::solana_program::program::invoke(
        //     &cpi_ix,
        //     &[
        //         ctx.accounts.depositor.to_account_info(),
        //         ctx.accounts.vault.to_account_info(),
        //         ctx.accounts.system_program.to_account_info(),
        //     ],
        // )?;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            cpi_accounts,
        );

        anchor_lang::system_program::transfer(cpi_ctx, amount)?; 

        // Obtain mutable access only when updating account data.
        let vault = &mut ctx.accounts.vault;
        vault.balance = new_balance;

        Ok(())
    }

    /// Withdraws `amount` lamports from the caller's vault back to the caller.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        vault.balance -= amount;

        **ctx.accounts.vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + 8 + 1, // Vault account's data + bump
        seeds = [b"vault", owner.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub owner: Signer<'info>,
}

#[account]
pub struct Vault {
    pub owner: Pubkey, // 32 bytes
    pub balance: u64,   // 8 bytes
    pub bump: u8,   // 1 byte
}

#[error_code]
pub enum VaultError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,

    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
}
