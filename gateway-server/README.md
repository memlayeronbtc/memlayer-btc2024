# memlayer-gateway-server
This gateway server should be deployed on a public server (e.g., AWS EC2 linux) for staying accessible for EVM contracts.

## quick start
1. `npm i` (node 18)
2. setup `.env`
3. `yarn start`

## aws deployment (hackathon server)
1. download .zip from github
2. scp into server, unzip replace all
3. create `.env` once
4. `nvm use 18`
5. `pm2 delete [id]`
6. `pm2 start "yarn start" --name memlayer --cron-restart="0 0 * * *"`
