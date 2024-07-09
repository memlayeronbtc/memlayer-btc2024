# memlayer-firebase-functions
firebase functions are serverless functions with a database access using firebase realtime database.

## quick start
- `npm i`
- setup config variables. check `firebase functions:config:get` and set with `firebase functions:config:set key1=val1 key2=val2`, then `firebase functions:config:get > .runtimeconfig.json`
- `firebase deploy --only functions`
