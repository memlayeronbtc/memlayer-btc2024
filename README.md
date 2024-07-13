

![memlayerlogo0](https://github.com/user-attachments/assets/5fb581af-dc9b-436c-9f72-898a2cd67455)
<img src=https://github.com/user-attachments/assets/b631e6df-2d0b-4f7e-be70-6241ec56742a height=256 />
# memlayer-btc2024
Memlayer lifts BTC runes to EVM erc20 directly from Mempool built with a BTC full node and CCIP-read gateway. This is a submission for the Bitcoin Games 2024 hackathon - sidechain category.

## description
Memlayer makes BTC mempool TXs, blocks, and runes data accessible by smart contracts on EVM sidechains. For example, when a user deposits BTC runes to a BTC address, Memlayer lifts this TX to Rootstack, Alys, or other EVM chains so that the user can further utilize this rune as an ERC-20 token. Memlayer is built based on the Cross-Chain Interoperability Protocol (CCIP) as CCIP-read gateways on top of a BTC mempool and block data (e.g., a BTC full node). For BTC runes with TURBO flags, Memlayer instantly lifts the rune amount and distributes the ERC-20 amount but with a transfer limit till L1 deposit confirmation.

![Memlayer (1)](https://github.com/user-attachments/assets/9b55236e-c811-4280-a8fe-54248cc03bca)


## Inspiration for Memlayer
1. **BTC runes** unlocked a new way of using Bitcoin since the 4th-halving block 840000. We were planning to integrate runes into our web3 game prototype. However, **adding utilities to BTC runes on Bitcoin L1 is hard**. What if there is an easy, fast, and secure way for rune-related projects to utilize BTC runes on any EVM chains where they'd like to build further usages?

2. **BTC mempool** has all the real-time info for the upcoming blocks. What if EVM chains can utilize mempool to provide utilities for TXs in the mempool? How can EVM smart contracts securely access BTC mempool TXs?

3. What if there is **a shared layer to serve and connect both Bitcoin and EVM chains**? Cross-Chain Interoperability Protocol (CCIP) is a way to provide a signed data availability service for smart contracts. _What if we combine a CCIP-read gateway with a BTC full node_ to utilize mempool TXs from smart contract calls?

## How to use Memlayer?
We created an **easy** and **fast** way to lift BTC runes to any EVM chains. Here are steps to use Memlayer: 

1. A user who'd like to send some of his/her BTC runes to an EVM chain.

2. S/he will pair their BTC and ETH addresses by signing in both BTC and ETH wallets.

![image](https://github.com/user-attachments/assets/a85b40de-7303-416e-86f7-28e4661ac8dc)


3. The user will see a list of available BTC runes and a BTC rune deposit address.

![image](https://github.com/user-attachments/assets/0a8152ff-e5ae-45fd-b249-4ff289492108)


4. The user sends the supported BTC runes to the BTC deposit address. As soon as this TX enters the mempool, Memlayer's CCIP gateway server picks it up 

## sidechain track challenges
Memlayer addresses the following challenges:

1. **Scalable Payment Solutions Challenge** - Using BTC runes for payments, games, or royalty rewards is not easy on the BTC L1 mainnet compared to using ERC-20 on EVM chains. Solving the utility problem of runes with sidechains can fuel growth for the whole BTC ecosystem. Memlayer makes lifting BTC runes to sidechains easy so more utilities can be built using EVM smart contracts.

2. **Interoperability Tools Challenge** - Cross-chain interoperability is critical because there will be more sidechains. What would be the minimalist approach to have a protocol supporting multiple sidechains simultaneously? Memlayer supports smart contracts from multiple EVM sidechains for accessing BTC data with a single gateway server.

3. **Smart Contract Platforms Challenge** - How to use Bitcoin block data or mempool data in EVM sidechains? We combine a CCIP-read server with a BTC full node to make BTC data accessible to smart contracts. We focus on rune TXs first, but we can make more BTC data available on the CCIP-read gateway.

4. **Loyalty Applications Challenge** - Distributing royalties on L1 may not be ideal but settling and withdrawing on L1 is essential. BTC rune usages have been surging and can be a great royalty infrastructure on L1. We enable users to deposit and withdraw runes with EVM sidechains with a simple CCIP-read solution.

5. **High-Throughput Data Oracles Challenge** - We combine a BTC full node with a CCIP-read server to enable BTC block data and mempool data read-only access via smart contracts. We currently focus on rune-related transactions for ERC-20 contracts on sidechains.

6. **Gaming and NFTs** - Players can deposit BTC runes and receive ERC-20 as balances and credentials in EVM web3 games. In addition, BTC runes can also serve as rewards, scores, and consumables in typical EVM web3 games.

## How it works
The core part is to enable BTC rune TXs directly lifted to EVM sidechains and allow smart contracts to access signed BTC TXs via the CCIP-read gateway. Memlayer consists of the following parts: 

### evm-contracts
This ERC-20 rune contract [`MemlayerToken.sol`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/evm-contracts/contracts/MemlayerToken.sol) works with the CCIP-read gateway server to process BTC rune deposit TXs from mempool. Unconfirmed rune deposits cannot be transferred and will be reverted. This ERC-20 contract is designed for serving lifted tokens with a rune-lifting, balance-checking, and transfer-locking mechanism. ERC-20 Memlayer token contracts will be deployed to sidechains and served as ERC-20 rune tokens written in Solidity, hardhat, and javascript.

### gateway-server
This CCIP-read gateway server (deployed on AWS) picks up mempool TXs and lifts runes to EVM chains. We attempted two ways to pick up BTC TXs (i.e., using btc-worker scripts on a full node or `mempool.space websocket API`). The gateway server signs the BTC data with the same private key that deploys the ERC-20 rune contracts for authenticity. This gateway server does not store any user or TX data.

### firebase-hosting
This is the front-end one-pager website for checking unconfirmed/confirmed balances and manually claiming/withdrawing BTC or ERC-20 runes. On this page, users pair their BTC and ETH addresses and start the rune-deposit process. They will see a list of rune info about the unconfirmed/confirmed balances. Users can also initiate withdrawal requests to burn the ERC-20 runes and the BTC worker script will send out runes to users' deposit addresses.

### firebase-functions
These serverless functions extend the gateway server by handling TXs and storing TX-related data on Firebase's real-time database. We store BTC and ETH address pairs so Memlayer can correctly send tokens to their designated addresses.

### btc-workers
There are worker scripts directly interacting with a BTC full-node for picking up deposit TXs and sending out withdraw TXs. A bitcoin full node with ord 0.19.0 for getting mempool and block TXs. BTC worker scripts were written in javascript to decode BTC rune deposit TXs and in python to send out the rune withdraw requests.

## Challenges we ran into
We had to prioritize ease-of-use and speed for this hackathon, and then enhance the security aspect for future extensions.

## Accomplishments that we're proud of
It is magical to see BTC runes lifted to EVM chains in seconds using Memlayer. This may bring BTC liquidity to EVM sidechain apps for more consumer-level experiences.

## What we learned
Memlayer can be a great self-hosting middle layer between BTC L1 and EVM sidechains when using CCIP-read on a BTC full node. This is an interesting direction that is worthy of future investigation.

## What's next for Memlayer
1. Have security reviews to plan paths for decentralizing more parts

2. Work with chain partners to integrate Memlayer for public demos

3. Make CCIP-read gateway more generic to access more BTC block data and mempool TXs

4. Extend ERC-20 runes with points and gamification

## references
- CCIP-read gateway https://github.com/smartcontractkit/
- BTC ordinals https://docs.ordinals.com/
