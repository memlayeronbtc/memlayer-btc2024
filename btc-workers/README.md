# memlayer-btc-workers

## quick start
1. run `runBTCSignet.bat` or mainnet
2. run `runOrdSignet.bat` or mainnet
3. check balance in ord `ord wallet balance`
4. open cmd and run your desired script (ex. `python withdrawWorker.py`)

## how **withdrawWorker.py** works
1. requests the server `https://us-central1-memlayer.cloudfunctions.net/getwithdrawreq` for withdraw transaction information (currently using test transaction info)
2. checks for transactions that the script already sent (used after the first loop) and deletes them
3. checks if there are any transactions left that need sending
4. gets rune balance (with ord), then checks if there are sufficient runes and if the transaction is already sent
5. sends the runes (with ord)
6. appends this transaction with the ID (from the server) to a dictionary saved outside the loop
