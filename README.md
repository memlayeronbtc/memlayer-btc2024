

![memlayerlogo0](https://github.com/user-attachments/assets/5fb581af-dc9b-436c-9f72-898a2cd67455)
[<img src=https://github.com/user-attachments/assets/b631e6df-2d0b-4f7e-be70-6241ec56742a height=256 />](https://b.tc/conference/2024/bitcoin-games)
# Memlayer-BTC2024
Memlayer lifts BTC runes to EVM sidechain erc20 tokens directly from BTC mempool. This is a submission for the [Bitcoin Games 2024 hackathon](https://b.tc/conference/2024/bitcoin-games) - sidechain category.

## Description
Memlayer makes BTC mempool TXs, blocks, and runes data accessible by smart contracts on EVM sidechains. For example, when a user deposits [BTC runes](https://docs.ordinals.com/) to a BTC address, Memlayer lifts this TX to **[Rootstack](https://rootstock.io/)**, **[Alys](https://github.com/AnduroHackathon/Alys)**, or other EVM chains so that the user can further utilize this rune as an ERC-20 token. Memlayer is built based on the Cross-Chain Interoperability Protocol (CCIP) as CCIP-read gateways on top of a BTC mempool and block data (e.g., a BTC full node). For BTC runes with TURBO flags (set to `true`) using Alys Testnet, Memlayer instantly lifts the rune amount and distributes the ERC-20 amount but with a transfer limit till L1 deposit confirmation. For BTC runes paired with Rootstock Testnet, users can see deposit balance appeared instantly in Memlayer dashboard because of the integrated CCIP-read gateway and users can claim ERC20 tokens after 1-confirmation for the BTC L1 deposit. Rootstock Testnet users can initate BTC L1 rune withdraw TXs if they want the rune balance sent back to their deposit address.

![Memlayer (3)](https://github.com/user-attachments/assets/a99c45a1-0a5e-4724-9b0f-ba83d3d04d90)

## Inspirations
1. **BTC runes** unlocked a new way of using Bitcoin since the 4th-halving block 840000. We were planning to integrate runes into our web3 game prototype. However, **adding utilities to BTC runes on Bitcoin L1 is hard**. What if there is an easy, fast, and secure way for rune-related projects to utilize BTC runes on any EVM chains where they'd like to build further usages?

2. **BTC mempool** has all the real-time info for the upcoming blocks. What if EVM chains can utilize mempool to provide utilities for TXs in the mempool? How can EVM smart contracts securely access BTC mempool TXs?

3. What if there is **a shared layer to serve and connect both Bitcoin and EVM chains**? Cross-Chain Interoperability Protocol (CCIP) is a way to provide a signed data availability service for smart contracts. _What if we combine a CCIP-read gateway with a BTC full node_ to utilize mempool TXs from smart contract calls?

## How to use Memlayer?
We created an **easy** and **fast** way to lift BTC runes to any EVM chains. Here are steps to use Memlayer: 

1. A user who'd like to send some of his/her BTC runes to an EVM chain.

2. S/he will pair their BTC and ETH addresses by signing in both BTC and ETH wallets.

![image](https://github.com/user-attachments/assets/e012786d-a88d-4e92-87f0-add6517b6256)

3. The user will see a list of available BTC runes and a BTC rune deposit address.

![image](https://github.com/user-attachments/assets/0a8152ff-e5ae-45fd-b249-4ff289492108)

4. The user sends the supported BTC runes to the BTC deposit address. As soon as this TX enters the mempool, Memlayer server picks it up and sends out ERC20 rune tokens. After few seconds, ERC20 rune tokens arrived in user's ETH wallet. However, **these tokens cannot be transferred until the BTC L1 rune deposit TX is confirmed (enforced by smart contracts)**.

![mem0001a](https://github.com/user-attachments/assets/ce8306e9-afe4-4b33-8542-b167dd02e87c)

![mem0001](https://github.com/user-attachments/assets/a0bb1079-a2f0-407d-854d-097de65cea83)

![mem0001b](https://github.com/user-attachments/assets/c8d18409-ce94-4961-a02f-c9ae081c4e8a)


## Sidechain track challenges
Memlayer addresses the following challenges:

1. **Scalable Payment Solutions Challenge** - Using BTC runes for payments, games, or royalty rewards is not easy on the BTC L1 mainnet compared to using ERC-20 on EVM chains. Solving the utility problem of runes with sidechains can fuel growth for the whole BTC ecosystem. Memlayer makes lifting BTC runes to sidechains easy so more utilities can be built using EVM smart contracts.

2. **Interoperability Tools Challenge** - Cross-chain interoperability is critical because there will be more sidechains. What would be the minimalist approach to have a protocol supporting multiple sidechains simultaneously? Memlayer supports smart contracts from multiple EVM sidechains for accessing BTC data with a single gateway server.

3. **Smart Contract Platforms Challenge** - How to use Bitcoin block data or mempool data in EVM sidechains? We combine a CCIP-read server with a BTC full node to make BTC data accessible to smart contracts. We focus on rune TXs first, but we can make more BTC data available on the CCIP-read gateway.

4. **Loyalty Applications Challenge** - Distributing royalties on L1 may not be ideal but settling and withdrawing on L1 is essential. BTC rune usages have been surging and can be a great royalty infrastructure on L1. We enable users to deposit and withdraw runes with EVM sidechains with a simple CCIP-read solution.

5. **High-Throughput Data Oracles Challenge** - We combine a BTC full node with a CCIP-read server to enable BTC block data and mempool data read-only access via smart contracts. We currently focus on rune-related transactions for ERC-20 contracts on sidechains.

6. **Gaming and NFTs** - Players can deposit BTC runes and receive ERC-20 as balances and credentials in EVM web3 games. In addition, BTC runes can also serve as rewards, scores, and consumables in typical EVM web3 games.

## How Memlayer works
The core part is to enable BTC rune TXs directly lifted to EVM sidechains and allow smart contracts to access signed BTC TXs via the CCIP-read gateway. Memlayer consists of the following parts: 

### evm-contracts
This ERC-20 rune contract [`MemlayerToken.sol`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/evm-contracts/contracts/MemlayerToken.sol) works with the CCIP-read gateway server to process BTC rune deposit TXs from mempool. Unconfirmed rune deposits cannot be transferred and will be reverted. This ERC-20 contract is designed for serving lifted tokens with a rune-lifting, balance-checking, and transfer-locking mechanism. ERC-20 Memlayer token contracts will be deployed to sidechains and served as ERC-20 rune tokens written in Solidity, hardhat, and javascript.

### gateway-server
This CCIP-read gateway server (deployed on AWS) picks up mempool TXs and lifts runes to EVM chains via [`app.ts`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/gateway-server/src/app.ts). We attempted two ways to pick up BTC TXs (i.e., using [btc-worker scripts](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/btc-workers/) on a full node and using `mempool.space websocket API` on the gateway server). The gateway server signs the BTC data with the same private key that deploys the ERC-20 rune contracts for authenticity. This gateway server does not store any user or TX data.

### firebase-hosting
This is the front-end one-pager website [`MainPage.jsx`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/firebase/hosting/src/pages/MainPage.jsx) for checking unconfirmed/confirmed balances and manually claiming/withdrawing BTC or ERC-20 runes. On this page, users pair their BTC and ETH addresses and start the rune-deposit process. They will see a list of rune info about the unconfirmed/confirmed balances. Users can also initiate withdrawal requests to burn the ERC-20 runes and the BTC worker script will send out runes to users' deposit addresses.

### firebase-functions
These serverless functions [`index.js`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/firebase/functions/index.js) extend the gateway server by handling TXs and storing TX-related data on Firebase's real-time database. We store BTC and ETH address pairs so Memlayer can correctly send tokens to their designated addresses.

### btc-workers
There are worker scripts directly interacting with a BTC full-node with `ord 0.19.0` for picking up deposit TXs using [`depositWorker.js`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/btc-workers/depositWorker.js) and sending out withdraw TXs using [`withdrawWorker.py`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/btc-workers/withdrawWorker.py). BTC worker scripts were written in javascript to decode BTC rune deposit TXs and in python to send out the rune withdraw requests.

## Challenges we ran into
We had to prioritize ease-of-use and speed for this hackathon, and then enhance the security aspect for future extensions.

## Accomplishments that we're proud of
It is magical to see BTC runes lifted to EVM chains in seconds using Memlayer. This may bring BTC liquidity to EVM sidechain apps for more consumer-level experiences.

## What we learned
Memlayer can be a great self-hosting middle layer between BTC L1 and EVM sidechains when using CCIP-read on a BTC full node. This is an interesting direction that is worthy of future investigation.

## What's next for Memlayer
1. Have security reviews to plan paths for decentralizing more parts and refactor the code base

2. Work with chain partners to integrate Memlayer for public demos

3. Make CCIP-read gateway more generic to access more BTC block data and mempool TXs

4. Extend ERC-20 runes with points and gamification

5. Explorer cross-chain hopping/swapping for locked (unconfirmed) balances

## How to start
1. setup `.env` in the root folder based on [`.env-project`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/.env-project)
2. compile and deploy [EVM contracts](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/evm-contracts/)
3. setup [firebase functions and hosting](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/firebase)
4. setup [ccip-read server](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/gateway-server)
5. setup a BTC full node with ord running ([guide](https://docs.ordinals.com/guides/wallet.html)) and run [btc workers](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/btc-workers)

## references
- CCIP-read gateway https://github.com/smartcontractkit/
- BTC ordinals https://docs.ordinals.com/

## contact
- https://x.com/memlayer
