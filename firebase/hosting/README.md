# memlayer-firebase-hosting
We use Firebase hosting for website front-end and serverless functions to interact with Firebase real-time database for connecting all parts using javascript and nodejs.

## quick start
1. `npm i`
2. configure `.env` based on [`.env-sample`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/firebase/hosting/.env-sample)
3. `npm run dev`

## deployment
1. `npm run build`
2. `npm run copy`
3. `firebase deploy --only hosting`
