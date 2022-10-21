import * as anchor from "@project-serum/anchor"
import { Program } from "@project-serum/anchor"
import { EventsOracle } from "../target/types/events_oracle"
import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair, SystemProgram } from '@solana/web3.js'
import { PythSolFeed, safeAirdrop } from './utils/utils'
import { eventCreator, participant1Keypair, participant2Keypair, participant3Keypair } from './test-keypairs/test-keypairs'
import { BN } from "bn.js"

describe("events-oracle", async () => {
  anchor.setProvider(anchor.AnchorProvider.env())

  const program = anchor.workspace.EventsOracle as Program<EventsOracle>
  const provider = anchor.AnchorProvider.env()
  const connection = provider.connection

  const [eventAddress, eventBump] = await PublicKey.findProgramAddress(
      [eventCreator.publicKey.toBuffer(), Buffer.from("event")],
      program.programId
    )

  const [participant1Entry, participant1Bump] = await PublicKey.findProgramAddress(
    [participant1Keypair.publicKey.toBuffer(), eventAddress.toBuffer(), Buffer.from("event-participant")],
    program.programId
  )

  it("Create Event", async () => {
    await safeAirdrop(eventCreator.publicKey, connection)
    await safeAirdrop(participant1Keypair.publicKey, connection)

    const tx = await program.methods.createEvent(new BN(1667538000))
    .accounts({
      authority: eventCreator.publicKey,
      event: eventAddress,
      pythAcct: PythSolFeed,
      systemProgram: SystemProgram.programId
    })
    .signers([eventCreator])
    .rpc()
    console.log("Create event tx: ", tx)
  })

  it("Join Event!", async () => {
    const tx = await program.methods.joinEvent(new BN(35))
    .accounts({
      user: participant1Keypair.publicKey,
      participant: participant1Entry,
      event: eventAddress,
      systemProgram: SystemProgram.programId
    })
    .signers([participant1Keypair])
    .rpc()
    console.log("Join event tx: ", tx)
  })
})
