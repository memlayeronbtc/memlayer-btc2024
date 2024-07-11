# memlayer-gateway-server
This gateway server was deployed on AWS linux for staying accessible via EVM contracts.

## aws deployment
1. download .zip from github
2. scp into server, unzip replace all
3. create `.env` once
4. `nvm use 18`
5. `pm2 delete [id]`
6. `pm2 start "yarn start" --name memlayer --cron-restart="0 0 * * *"`
