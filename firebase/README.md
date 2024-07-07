# memlayer-firebase

## quick start

in the functions folder, start local emulator only with firebase functions - `firebase emulators:start --only functions`

in the firebase root folder, deploy to firebase - `firebase deploy --only functions`

## one-time local emulator setup

get current env variables - `firebase functions:config:get`

set new env variables with `firebase functions:config:set key1=val1 key2=val2`

[required] after setting env vars, download current env variable so that local emulator can run - `firebase functions:config:get > .runtimeconfig.json`

## Tools
- remove unused npm modules `npx depcheck`
