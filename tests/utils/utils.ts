import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import axios from 'axios'

export const PythSolFeed: PublicKey = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix")

export function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

export async function safeAirdrop(address: PublicKey, connection: Connection) {
    const acctInfo = await connection.getAccountInfo(address, "confirmed")

    if (acctInfo == null || acctInfo.lamports < LAMPORTS_PER_SOL) {
        let signature = await connection.requestAirdrop(
            address,
            LAMPORTS_PER_SOL
        )
        await connection.confirmTransaction(signature)
    }
}

export async function hasContestEnded(contest: PublicKey) {
    axios.get('https://raindrops-contests-crank.herokuapp.com/getContest?contest='+contest.toBase58(), {
    })
    .then(function (response) {
    })
    .catch(function (error) {
        console.log(error)
    })
}