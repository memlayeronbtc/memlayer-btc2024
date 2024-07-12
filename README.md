# memlayer-btc2024
Memlayer lifts BTC runes to EVM erc20 directly from Mempool built with a BTC full node and CCIP-read gateway. This is a submission for the Bitcoin Games 2024 hackathon.

## description
Memlayer makes BTC mempool TXs, blocks, and runes data accessible by smart contracts on EVM sidechains. For example, when a user deposit BTC runes to a BTC address, Memlayer lifts this TX to Rootstack, Alys, or other EVM chains so that the user can further utilize this rune as an ERC-20 token. Memlayer is built based on the Cross-Chain Interoperability Protocol (CCIP) as CCIP-read gateways on top of a BTC mempool and block data (e.g., a BTC full node). For BTC runes with TURBO flags, Memlayer instantly lifts the rune amount and distribute the ERC-20 amount but with a transfer limit till L1 deposit confirmation.

## sidechain track challenges
1. **Scalable Payment Solutions Challenge** - It is not easy to use BTC runes for payments, games, or royalty rewards on BTC L1 mainnet. Solving the utility problem of runes with sidechains can fuel growth for the whole BTC ecosystem. Memlayer makes it easier to lift BTC runes to sidechains so that more utilities can be built using EVM smart contracts.

2. **Interoperability Tools Challenge** - Crosschain interoperability is critical because there will be more sidechains. What would be the minimalism approach to have a protocol that supports multiple sidechains at once. Memlayer supports smart contracts from multiple EVM sidechains for accessing BTC data with a single gateway server.

3. **Smart Contract Platforms Challenge** - How to use Bitcoin block data or mempool data in EVM sidechains? We combine a CCIP-read server with a BTC full node to make BTC data accessible to smart contracts. We focus on rune TXs first, but it seems to us we can make more BTC data available on the CCIP-read gateway.

4. **Loyalty Applications Challenge** - Distributing royalties on L1 may not be ideal but settling and withdrawing on L1 is essential. BTC rune usages have been surging and can be a great royalty infrastructure on L1. We enable users to deposit and withdraw runes with EVM sidechains with a simple CCIP-read solution.

5. **High-Throughput Data Oracles Challenge** - We combine a BTC full node with a CCIP-read server to enable BTC block data and mempool data read-only access via smart contracts. We currently focus on rune-related transactions for ERC-20 contracts on sidechains.

6. **Gaming and NFTs** - Players can deposit BTC runes and receive ERC-20 as balances and credentials in EVM web3 games. In addition, BTC runes can also serve as rewards, scores, and consumables in typcial EVM web3 games.

## evm-contracts
This ERC-20 contract `MemlayerToken.sol` works together with the CCIP-read gateway server to process BTC rune deposit TXs from mempool. Unconfirmed rune deposits cannot be transferred and will be reverted.

## gateway-server
This CCIP-read gateway server (deployed on AWS) picks up mempool TXs and lifts runes to EVM chains.

## firebase hosting
This is the front-end one-pager website for checking unconfirmed/confirmed balances and for manually claiming/withdrawing BTC or ERC-20 runes.

## firebase functions
These serverless functions handle TXs and store data on firebase real-time database

## btc-workers
There are worker scripts directly working with a BTC full-node for picking up deposit TXs and sending out withdraw TXs.

## references
- CCIP-read gateway https://github.com/smartcontractkit/ccip-read/tree/master/packages/examples/trusted-gateway-token
- BTC ordinals https://docs.ordinals.com/
