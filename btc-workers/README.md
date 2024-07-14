# Memlayer-BTC-Workers
These BTC worker scripts manage deposits and withdrawals for Memlayer.

## Quick Start
BTC worker scripts need to be executed on a BTC full-node with [ord](https://docs.ordinals.com/) 
1. set up a full node and run `ord wallet balance`
2. update constants based on your setup e.g., ord path
3. `npm i` 
4. run script `python withdrawWorker.py` or `node depositWorker.js` (`python3`)

## How **withdrawWorker.py** works
1. Requests withdraw transaction information from our Firebase server
2. Checks and deletes transactions the script has already sent (used after the first loop)
3. Verifies if any remaining transactions need to be sent
4. Retrieves the rune balance (using ord), checks for sufficient runes, and verifies if the transaction has already been sent
5. Sends the runes (using ord)
6. Appends the transaction with its ID (from the server) to a dictionary saved outside the loop

## How **depositWorker.js** works
1. The first function receives transactions using ord and checks if any have already been processed
2. The next function decodes the raw transaction (rawtx) from the previous step, returning the runeId and amount sent. It also filters out transactions that aren't sending runes
3. A POST request is sent to our Firebase server with the data collected (sender address, runeId, amount sent, transactionId, and confirmation)
4. Each transaction sent to the Firebase server includes a 2-second delay between each request
5. All of the above steps are repeated every 20 seconds
