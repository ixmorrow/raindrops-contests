import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { EventsOracle } from "../target/types/events_oracle"
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { PythSolFeed, safeAirdrop, delay } from './utils/utils'
import { participant1Keypair, participant2Keypair, participant3Keypair, programAuthority } from './test-keypairs/test-keypairs'
import { BN } from "bn.js"
import { Key, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, getAccount,
  createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { assert } from "chai"
import axios from 'axios'

anchor.setProvider(anchor.AnchorProvider.env())
const eventCreator = new Keypair()
let rewardMintAddress: PublicKey = null
const program = anchor.workspace.EventsOracle as Program<EventsOracle>
const provider = anchor.AnchorProvider.env()
const connection = provider.connection

describe("events-oracle", async () => {

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

  const [rewardVault, rewardBump] = await PublicKey.findProgramAddress(
    [Buffer.from("reward-vault"), eventAddress.toBuffer()],
    program.programId
  )

  it("Create Event", async () => {
    await safeAirdrop(eventCreator.publicKey, connection)
    await safeAirdrop(participant1Keypair.publicKey, connection)

    let rewardMint = await createMint(
      connection,
      eventCreator,
      eventCreator.publicKey,
      null,
      9
    )
    rewardMintAddress = rewardMint

    const currentUnixTime = Math.round((new Date()).getTime() / 1000)
    const endBetting = currentUnixTime+30
    const endTime = currentUnixTime+35

    const tx = await program.methods.createEvent(new BN(endBetting), new BN(endTime), new BN(5))
      .accounts({
        authority: eventCreator.publicKey,
        event: eventAddress,
        pythPriceFeed: PythSolFeed,
        contestMint: contestMint,
        programMintAuthority: programMintAuthority,
        rewardMint: rewardMint,
        rewardVault: rewardVault,
        metadataAccount: metadataAddress,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY
      })
      .signers([eventCreator])
      .rpc()

      await connection.confirmTransaction(tx)

      // add contest to crank db
      axios.post('https://raindrops-contests-crank.herokuapp.com/addContest', {
        contestPubkey: eventAddress.toBase58(),
        creator: eventCreator.publicKey.toBase58(),
        priceFeed: PythSolFeed.toBase58(),
        endTime: endTime
      })
      .catch(function (error) {
        console.log(error)
      })

      console.log("Contest: ", eventAddress.toBase58())
  })

  it("First participant joins event!", async () => {
    const ata = await getOrCreateAssociatedTokenAccount(connection, participant1Keypair, rewardMintAddress, participant1Keypair.publicKey)
    await mintTo(
      connection,
      participant1Keypair,
      rewardMintAddress,
      ata.address,
      eventCreator,
      100 * 100000000
    )

    const [participant1Entry, participant1Bump] = await PublicKey.findProgramAddress(
      [participant1Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant1Keypair.publicKey)
    const userWagerTokenAddress = await getAssociatedTokenAddress(rewardMintAddress, participant1Keypair.publicKey)

    let tx = await program.methods.joinEvent(new BN(352))
      .accounts({
        user: participant1Keypair.publicKey,
        participant: participant1Entry,
        event: eventAddress,
        contestMint: contestMint,
        userTokenAccount: userTokenAddress,
        userWagerTokenAccount: userWagerTokenAddress,
        rewardVault: rewardVault,
        programMintAuthority: programMintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
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

    const ata = await getOrCreateAssociatedTokenAccount(connection, participant2Keypair, rewardMintAddress, participant2Keypair.publicKey)
    await mintTo(
      connection,
      participant2Keypair,
      rewardMintAddress,
      ata.address,
      eventCreator,
      100 * 100000000
    )

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
        userWagerTokenAccount: ata.address,
        rewardVault: rewardVault,
        programMintAuthority: programMintAuthority,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
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

    const ata = await getOrCreateAssociatedTokenAccount(connection, participant3Keypair, rewardMintAddress, participant3Keypair.publicKey)
    await mintTo(
      connection,
      participant3Keypair,
      rewardMintAddress,
      ata.address,
      eventCreator,
      100 * 100000000
    )

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
        userWagerTokenAccount: ata.address,
        rewardVault: rewardVault,
        programMintAuthority: programMintAuthority,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
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

  // END EVENT HANDLED BY CRANK

  it("User 2 submits prediction", async () => {
    // wait for the crank to end contest
    let currentUnixTime = Math.round((new Date()).getTime() / 1000)
    const contest = await program.account.event.fetch(eventAddress)
    console.log("Current: ", currentUnixTime)
    console.log("End: ", contest.endTime.toNumber())
    await delay(30000)
    let newUnixTime = Math.round((new Date()).getTime() / 1000)
    console.log("Current: ", newUnixTime)
    
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

  it("Third participant claims their rewards", async () => {
    const [participant3Entry, participant2Bump] = await PublicKey.findProgramAddress(
      [participant3Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
      program.programId
    )
    const userTokenAddress = await getAssociatedTokenAddress(contestMint, participant3Keypair.publicKey)
    const userWagerTokenAccount = await getAssociatedTokenAddress(rewardMintAddress, participant3Keypair.publicKey)

    let tx = await program.methods.claimRewards()
      .accounts({
        user: participant3Keypair.publicKey,
        participant: participant3Entry,
        event: eventAddress,
        contestMint: contestMint,
        userTokenAccount: userTokenAddress,
        userWagerTokenAccount: userWagerTokenAccount,
        rewardVault: rewardVault,
        programMintAuthority: programMintAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([participant3Keypair])
      .rpc()

      await connection.confirmTransaction(tx)
  })

})
