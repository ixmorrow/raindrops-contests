use {
    anchor_lang::prelude::*,
    crate::state::*,
    anchor_spl::{
        token::{Mint, Token, TokenAccount},
    },
    mpl_token_metadata::{
        ID,
        instruction::{create_metadata_accounts_v3}
    },
    solana_program::program::{invoke_signed},
};


pub fn handler(ctx: Context<CreateEventCtx>, end_betting_time: i64, end_time_unix: i64, wager_amt: u64) -> Result<()> {
    // contest must end in future
    require_gt!(end_time_unix, Clock::get().unwrap().unix_timestamp);

    // create metadata account
    let ix = create_metadata_accounts_v3(
        ctx.accounts.metadata_program.key(),
        ctx.accounts.metadata_account.key(),
        ctx.accounts.contest_mint.key(),
        ctx.accounts.program_mint_authority.key(),
        ctx.accounts.authority.key(),
        ctx.accounts.program_mint_authority.key(),
        // pass these in as arguments
        "test contest".to_string(),
        "CRD".to_string(),
        "test_uri".to_string(), 
        None,
        0,
        false,
        false,
        None,
        None,
        None
    );

    // program signer seeds
    let auth_bump = *ctx.bumps.get("program_mint_authority").unwrap();
    let auth_seeds = &[MINT_AUTHORITY_SEED.as_bytes(), &[auth_bump]];
    let signer = &[&auth_seeds[..]];

    // create metadata account for SFT
    invoke_signed(
        &ix,
        &[
            ctx.accounts.metadata_program.to_account_info(),
            ctx.accounts.metadata_account.to_account_info(),
            ctx.accounts.contest_mint.to_account_info(),
            ctx.accounts.program_mint_authority.to_account_info(),
            ctx.accounts.authority.to_account_info()
        ],
        signer
    )?;


    let event = &mut ctx.accounts.event;
    event.creator = ctx.accounts.authority.key();
    event.bump = *ctx.bumps.get("event").unwrap();
    event.start_time = Clock::get().unwrap().unix_timestamp;
    event.end_betting = end_betting_time;
    event.end_time = end_time_unix;
    event.status = EventState::Started;
    event.registration = EventState::Open;
    event.pyth_price_feed = ctx.accounts.pyth_price_feed.key();
    event.event_mint = ctx.accounts.contest_mint.key();
    event.mint_authority = ctx.accounts.program_mint_authority.key();
    event.mint_authority_bump = *ctx.bumps.get("program_mint_authority").unwrap();
    event.reward_mint = ctx.accounts.reward_mint.key();
    event.reward_vault = ctx.accounts.reward_vault.key();
    event.wager_amt= wager_amt;
    event.pot_total = 0;

    Ok(())
}

#[derive(Accounts)]
pub struct CreateEventCtx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        seeds = [authority.key().as_ref(), EVENT_SEED.as_bytes()],
        bump,
        payer = authority,
        space = EVENT_SIZE
    )]
    pub event: Account<'info, Event>,
    /// CHECK: pyth account, should run some check on it
    pub pyth_price_feed: AccountInfo<'info>,
    // mint for the Token representing participation in this contest
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = program_mint_authority,
        seeds = [CONTEST_MINT_SEED.as_bytes(), event.key().as_ref()],
        bump
    )]
    pub contest_mint: Account<'info, Mint>,
    ///CHECK: program mint authority
    #[account(
        seeds = [MINT_AUTHORITY_SEED.as_bytes()],
        bump
    )]
    pub program_mint_authority: AccountInfo<'info>,
    pub reward_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = reward_mint,
        token::authority = program_mint_authority,
        seeds = [REWARD_VAULT_SEED.as_bytes(), event.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    ///CHECK: safe metadata account
    #[account(mut)]
    pub metadata_account: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    ///CHECK: safe because we verify this is the metadata program
    #[account(constraint = metadata_program.key() == ID)]
    pub metadata_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}