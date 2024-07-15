# memlayer-gateway-server
This gateway server should be deployed on a public server (e.g., AWS EC2 linux) for staying accessible for EVM contracts. You will need the private key that you used to deploy token contracts to sign your CCIP-read data. More details can be found in the references.

## quick start
1. `npm i` (node 18)
2. setup `.env` based on [`.env-server`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/gateway-server/.env-server)
3. `yarn start`
4. try to send rune depost TXs to see if the server picks up
5. call the contract functions to see if CCIP-read functions are running properly

## aws deployment notes (hackathon server)
1. download .zip from github
2. scp into server, unzip replace all
3. create `.env` once
4. `nvm use 18`
5. `pm2 delete [id]`
6. `pm2 start "yarn start" --name memlayer --cron-restart="0 * * * *"`

## References
- CCIP-read gateway sample https://github.com/smartcontractkit/
- ERC-3668 CCIP-read https://eips.ethereum.org/EIPS/eip-3668