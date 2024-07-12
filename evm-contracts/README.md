# memlayer-evm-contracts
this is an evm erc20 token contract that access CCIP-read server via contract calls. CCIP-read gateway server and firebase functions needs to be fully configured and deployed for this contract to work properly. 

## quick start
- `npm i`
- configure `.env` based on `sample.env`
- setup chain info in `hardhat.config.js`
- `npx hardhat test`
- `npx hardhat run scripts\deploy.js --network rskTestnet` deploy to evm chains
- setup CCIP-read gateway server and firebase functions

## utility
`npx prettier --write --plugin=prettier-plugin-solidity contracts`

## refs
- CCIP-read EIP: https://eips.ethereum.org/EIPS/eip-3668
- CCIP-read sample project: https://github.com/smartcontractkit/ccip-read
