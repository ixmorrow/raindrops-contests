import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { EventsOracle } from "../target/types/events_oracle"
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { PythSolFeed, safeAirdrop, delay } from './utils/utils'
import { participant1Keypair, participant2Keypair, participant3Keypair } from './test-keypairs/test-keypairs'
import { BN } from "bn.js"
import { PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token'
import { assert } from "chai"

describe("events-oracle", async () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventsOracle as Program<EventsOracle>
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection

  const eventCreator = new Keypair()

  const [eventAddress, eventBump] = await PublicKey.findProgramAddress(
      [eventCreator.publicKey.toBuffer(), Buffer.from("event")],
      program.programId
    )

  const [programMintAuthority, authBump] = await PublicKey.findProgramAddress(
    [Buffer.from("mint-authority")],
    program.programId
  )

  const [contestMint, mintBump] = await PublicKey.findProgramAddress(
    [Buffer.from("contest-mint"), eventAddress.toBuffer()],
    program.programId
  )

  const [metadataAddress, metadataBump] = await PublicKey.findProgramAddress(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), contestMint.toBuffer()],
    METADATA_PROGRAM_ID
  )

  it("Create Event", async () => {
    await safeAirdrop(eventCreator.publicKey, connection)
    await safeAirdrop(participant1Keypair.publicKey, connection)
    const currentUnixTime = Math.round((new Date()).getTime() / 1000)

    const tx = await program.methods.createEvent(new BN(currentUnixTime+8))
      .accounts({
        authority: eventCreator.publicKey,
        event: eventAddress,
        pythPriceFeed: PythSolFeed,
        contestMint: contestMint,
        programMintAuthority: programMintAuthority,
        metadataAccount: metadataAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([eventCreator])
      .rpc()

      await connection.confirmTransaction(tx)
  })

  it("First participant joins event!", async () => {
    const [participant1Entry, participant1Bump] = await PublicKey.findProgramAddress(
      [participant1Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant1Keypair.publicKey)

    let tx = await program.methods.joinEvent(new BN(352))
      .accounts({
        user: participant1Keypair.publicKey,
        participant: participant1Entry,
        event: eventAddress,
        contestMint: contestMint,
        userTokenAccount: userTokenAddress,
        programMintAuthority: programMintAuthority,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([participant1Keypair])
      .rpc()

      await connection.confirmTransaction(tx)

      let userTokenAcct = await getAccount(connection, userTokenAddress)
      let participantStateAcct = await program.account.eventParticipant.fetch(participant1Entry)
      assert(userTokenAcct.amount == BigInt(1))
      assert(participantStateAcct.contestantMint.toBase58() == contestMint.toBase58())
      assert(participantStateAcct.contestantTokenAcct.toBase58() == userTokenAddress.toBase58())
  })

  it("Second participant joins event!", async () => {
    await safeAirdrop(participant2Keypair.publicKey, connection)
    const [participant2Entry, participant2Bump] = await PublicKey.findProgramAddress(
      [participant2Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant2Keypair.publicKey)

    let tx = await program.methods.joinEvent(new BN(42))
      .accounts({
        user: participant2Keypair.publicKey,
        participant: participant2Entry,
        event: eventAddress,
        contestMint: contestMint,
        userTokenAccount: userTokenAddress,
        programMintAuthority: programMintAuthority,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([participant2Keypair])
      .rpc()

      await connection.confirmTransaction(tx)

      let userTokenAcct = await getAccount(connection, userTokenAddress)
      let participantStateAcct = await program.account.eventParticipant.fetch(participant2Entry)
      assert(userTokenAcct.amount == BigInt(1))
      assert(participantStateAcct.contestantMint.toBase58() == contestMint.toBase58())
      assert(participantStateAcct.contestantTokenAcct.toBase58() == userTokenAddress.toBase58())
  })

  it("Third participant joins event!", async () => {
    await safeAirdrop(participant3Keypair.publicKey, connection)
    const [participant3Entry, participant2Bump] = await PublicKey.findProgramAddress(
      [participant3Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant3Keypair.publicKey)

    let tx = await program.methods.joinEvent(new BN(3155590500))
      .accounts({
        user: participant3Keypair.publicKey,
        participant: participant3Entry,
        event: eventAddress,
        contestMint: contestMint,
        userTokenAccount: userTokenAddress,
        programMintAuthority: programMintAuthority,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([participant3Keypair])
      .rpc()

      await connection.confirmTransaction(tx)

      let userTokenAcct = await getAccount(connection, userTokenAddress)
      let participantStateAcct = await program.account.eventParticipant.fetch(participant3Entry)
      assert(userTokenAcct.amount == BigInt(1))
      assert(participantStateAcct.contestantMint.toBase58() == contestMint.toBase58())
      assert(participantStateAcct.contestantTokenAcct.toBase58() == userTokenAddress.toBase58())
  })

  it("End event!", async () => {
    // giving the contest some time to end
    await delay(5000)

    await program.methods.endEvent()
      .accounts({
        authority: eventCreator.publicKey,
        event: eventAddress,
        pythPriceFeed: PythSolFeed,
      })
      .signers([eventCreator])
      .rpc()
  })

  it("User 1 submits prediction", async () => {
    const [participant1Entry, participant1Bump] = await PublicKey.findProgramAddress(
      [participant1Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant1Keypair.publicKey)

    await program.methods.submitPrediction()
    .accounts({
      user: participant1Keypair.publicKey,
      participant: participant1Entry,
      userTokenAccount: userTokenAddress,
      event: eventAddress,
    })
    .signers([participant1Keypair])
    .rpc()
  })

  it("User 2 submits prediction", async () => {
    const [participant2Entry, participant1Bump] = await PublicKey.findProgramAddress(
      [participant2Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant2Keypair.publicKey)

    await program.methods.submitPrediction()
    .accounts({
      user: participant2Keypair.publicKey,
      participant: participant2Entry,
      userTokenAccount: userTokenAddress,
      event: eventAddress,
    })
    .signers([participant2Keypair])
    .rpc()
  })

  it("User 3 submits prediction", async () => {
    const [participant3Entry, participant1Bump] = await PublicKey.findProgramAddress(
      [participant3Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant3Keypair.publicKey)

    await program.methods.submitPrediction()
    .accounts({
      user: participant3Keypair.publicKey,
      participant: participant3Entry,
      userTokenAccount: userTokenAddress,
      event: eventAddress,
    })
    .signers([participant3Keypair])
    .rpc()
  })
})
