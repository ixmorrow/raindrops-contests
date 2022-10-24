import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { EventsOracle } from "../target/types/events_oracle"
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { PythSolFeed, safeAirdrop, delay } from './utils/utils'
import { participant1Keypair, participant2Keypair, participant3Keypair } from './test-keypairs/test-keypairs'
import { BN } from "bn.js"
import { PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

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

  const [participant1Entry, participant1Bump] = await PublicKey.findProgramAddress(
    [participant1Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
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

    await program.methods.createEvent(new BN(currentUnixTime+5))
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
  })

  it("Join Event!", async () => {
    let tx = await program.methods.joinEvent(new BN(35))
      .accounts({
        user: participant1Keypair.publicKey,
        participant: participant1Entry,
        event: eventAddress,
        systemProgram: SystemProgram.programId
      })
      .signers([participant1Keypair])
      .rpc()

      await connection.confirmTransaction(tx)
  })

  it("End event!", async () => {
    // giving the contest some time to end
    await delay(3000)

    await program.methods.endEvent()
      .accounts({
        authority: eventCreator.publicKey,
        event: eventAddress,
        pythPriceFeed: PythSolFeed,
      })
      .signers([eventCreator])
      .rpc()
  })
})
