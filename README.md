# Raindrops Contests
[Raindrops Events Service](https://docs.raindrops.xyz/services/events)

This repo contains the Raindrops Contests program. This program allows anyone to create a contest that any number of users can join. This is an MVP that only supports contests that allow users to guess the price of some asset at a predefined point in time. The program uses pyth to determine the final price of the asset.

## Instructions

### `create_event`

A user can create an event and define the time to close betting and end the event by getting the price of the asset at the end time.

When an event is created, a [Fungible Asset or Semi-Fungible Token](https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-asset-standard) is created for that specific event. When a user joins the event, they are minted one of the event's SFTs that serve two purposes:

a.) they help with the user experience by giving the user something cool in their wallet to signify that they're participating in a contest

b.) they also serve as a receipt/proof that they recorded their prediction on-chain before the contest's betting period has ended

When a contest is created, a POST request needs to also be sent to the [oracle crank](https://github.com/ixmorrow/raindrops-oracle-crank) to register it.

### `join_event`

Any number of users can call this instruction to join a specific contest as long as the registration/betting period is not over. Once the betting period has passed, the contest will not accpet any more registrations.

Joining a contest is how a user's prediction is recorded on-chain and then they are minted the contest's SFT.

### `end_event`

Contests end at a specific point in time, so the oracle crank monitors the active contests and calls this instruction to mark an event as 'Finished' once its `endTime` has been reached. 

This instruction also grabs the current price of the asset in question from the Pyth account passed in and uses that as the contest's final price.


### `submit_prediction`

The program follows a pull based design, meaning that once a user essentially records their prediction on-chain with `join_event` they are required to call this instruction again once the contest has finished so that the program can determine who has the closest guess.

There is a time window where users can submit their predictions for review after a contest has finished. The submission with the closest guess at the end of the time frame is considered the winner.

There could definitely be some changes made here. In its current state, the program does not account for multiple winners (1st, 2nd, 3rd, etc.), or ties.

### `claim_rewards`

Once the submission period is over, the program has stored who it has deemed as the winner of the contest based on the users who submitted their predictions for review.

The winner can then call the `claim_rewards` instruction that will transfer the rewards stored in the pot to the user.

Anyone can obviously call this instruction but the program will only transfer the rewards to the user who it's deemed as the winner of the contest.