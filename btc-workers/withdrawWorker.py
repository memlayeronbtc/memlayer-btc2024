import subprocess, time, requests, sys, json

ordPath = "D:\\code\\ord-0.18.5\\ord.exe"
url = "https://us-central1-memlayer.cloudfunctions.net/getwithdrawreq"
isDryRun = False
totalTransactionsList = {}


while True:
    response = requests.get(url)
    response_json = response.json()
    # withdraw_requests = response_json['withdrawRequests'] ##real code
    testWithdraw = {
    '-O0ynah_THC1Gw0Ag4yw': {
        'amount': '999', 
        'confirmed': False, 
        'fromEthAddress': '0x87b0b999f86B87c99a64A3062bb6AA8830877A3C', 
        'lastUpdate': 1720114375520, 
        'network': 'rskTestnet', 
        'ordAddress': 'tb1pr9d2gu2e7z6xvqj4qpkjnuk3fv87qcmhjupvjzcynqnwes8tng4qt3983t', 
        'sent': False, 
        'sentTx': '', 
        'ticker': 'TESTRUNE'
        }, 

    '-O0ynbnPKCQn7dcZ5pIT': {
        'amount': '499', 
        'confirmed': False, 
        'fromEthAddress': '0x87b0b999f86B87c99a64A3062bb6AA8830877A3C', 
        'lastUpdate': 1720114380755, 
        'network': 'rskTestnet', 
        'ordAddress': 'tb1p72pg083vgmrrhjq55cmx6zega53pg3x6wfe62cjqe4pq7smqmdcsvyrkp9', 
        'sent': False, 
        'sentTx': '', 
        'ticker': 'TESTRUNE'
        }, 

    '-O0yncvOtFR3PZ_rkfTY': {
        'amount': '2000', 
        'confirmed': False, 
        'fromEthAddress': '0x87b0b999f86B87c99a64A3062bb6AA8830877A3C', 
        'lastUpdate': 1720114385362, 
        'network': 'rskTestnet', 
        'ordAddress': 'tb1pju2hyn28ugt7h38wujzd6zuhl6llsp2x368zqulalyqaydjp797sxfgduy', 
        'sent': False, 
        'sentTx': '', 
        'ticker': 'TESTRUNE'
        }
    }
    withdraw_requests = testWithdraw
    i1 = 0
    deleteDupes = []

    for x in withdraw_requests: ##selects ids that are dupes
        if x in totalTransactionsList.values():
            deleteDupes.append(x)

    for y in deleteDupes: ##deletes those ids
        del withdraw_requests[y]

    print("withdraw_requests", withdraw_requests)
    if len(withdraw_requests) == 0:
        print("sent all")
        time.sleep(60)
        continue

    command = [ordPath, "--signet", "wallet", "balance"]
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    balanceList = json.loads(result.stdout)
    runesOwned = balanceList['runes']

    for key, value in withdraw_requests.items(): ##checks if there is sufficient runes, and if the transaction is sent (picks out transaction from the request from the server)
        if (value.get("ticker") in runesOwned and int(runesOwned[value.get("ticker")]) > int(value.get("amount")) and value.get("sent") == False):
            
            transactionList = list(withdraw_requests.values())
            transactionInfo = transactionList[i1]

            idServerList = list(withdraw_requests.keys())
            idServer = idServerList[i1]
            break
        i1 += 1

    if i1 > len(withdraw_requests.items()): ## If the there isn't sufficient runes in the wallet (possiblely due to multiple transactions with the same rune)
        time.sleep(60)
        continue

    amount = transactionInfo['amount']
    address = transactionInfo['ordAddress']
    ticker = transactionInfo['ticker']

    ## send runes
    rune = f"{amount}:{ticker}"
    command = [ordPath, "--signet", "wallet", "send", "--fee-rate",  "1", address, rune,  "--postage", "546sat", "--dry-run"]

    if isDryRun == False:
        command.pop()

    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    commandOutput = json.loads(result.stdout)
    print(result.stdout)
    transactionID = commandOutput["txid"]
    totalTransactionsList[transactionID] = idServer
    withdraw_requests[idServer]['sent'] = True
    time.sleep(60)