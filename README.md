# memlayer-btc2024
Memlayer lifts BTC runes to EVM erc20 directly from Mempool built with a BTC full node and CCIP-read gateway. This is a submission for the Bitcoin Games 2024 hackathon.

Memlayer makes BTC mempool TXs, blocks, and runes data accessible by smart contracts on EVM sidechains. For example, when a user deposit BTC runes to a BTC address, Memlayer lifts this TX to Rootstack, Alys, or other EVM chains so that the user can further utilize this rune as an ERC-20 token. Memlayer is built based on the Cross-Chain Interoperability Protocol (CCIP) as CCIP-read gateways on top of a BTC mempool and block data (e.g., a BTC full node). For BTC runes with TURBO flags, Memlayer instantly lifts the rune amount and distribute the ERC-20 amount but with a transfer limit till L1 deposit confirmation.

## evm-contracts
This erc20 contract `MemlayerToken.sol` works together with the CCIP-read gateway server to process BTC rune deposit TXs from mempool. Unconfirmed rune deposits cannot be transferred and will be reverted.

## gateway-server
This CCIP-read gateway server (deployed on AWS) picks up mempool TXs and lifts runes to EVM chains.

## firebase hosting
This is the front-end one-pager of the hackathon project website.

## firebase functions
These serverless functions handle TXs and store data on firebase real-time database

## references
- CCIP-read gateway https://github.com/smartcontractkit/ccip-read/tree/master/packages/examples/trusted-gateway-token
- BTC ordinals https://docs.ordinals.com/
