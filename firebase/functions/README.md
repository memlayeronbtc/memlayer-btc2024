# memlayer-firebase-functions
firebase functions are serverless functions with a database access using firebase realtime database.

## quick start
- `npm i`
- setup config variables. using [`config-sample.json`](https://github.com/memlayeronbtc/memlayer-btc2024/blob/main/firebase/functions/config-sample.json)
- check `firebase functions:config:get`
- set with `firebase functions:config:set key1=val1 key2=val2`
- `firebase functions:config:get > .runtimeconfig.json`
- `firebase emulators:start --only functions`

## deployment
- `firebase deploy --only functions`
