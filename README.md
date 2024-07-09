# memlayer-btc2024
a CCIP-read gateway to lift BTC runes to EVM erc20 directly from Mempool

## contracts
erc20 contract reads mempool TXs via CCIP-read

## server
CCIP-read gateway picks up mempool TXs and lifts runes to target EVM chain

## client
TS client interacts with a CCIP erc-20 contract

## aws deployment
1. download .zip from github
2. scp into server, unzip replace all
3. create `.env` once
4. `nvm use 18`
5. `pm2 delete [id]`
6. `pm2 start "yarn start" --name memlayer --cron-restart="0 0 * * *"`

## reference
- https://github.com/smartcontractkit/ccip-read/tree/master/packages/examples/trusted-gateway-token
