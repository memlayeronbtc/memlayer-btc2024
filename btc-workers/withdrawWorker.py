import subprocess, time, requests, sys, json, pprint

ordPath = "C:\\code\\ordinals-ord\\target\\release\\ord.exe"
url = "https://us-central1-memlayer.cloudfunctions.net/getwithdrawreq"
isMainnet = True
willBroadcast = False
totalTransactionsList = {}
ordWalletName = "memlayer0" ## default: ord, u need to replace it to the wallet name that funds the withdraws

def getFeeRate():
    response0 = requests.get("http://127.0.0.1/r/blockheight")
    blockHeight = response0.text
    print(blockHeight)
    response = requests.get(f"http://127.0.0.1/r/blockinfo/{blockHeight}")
    response_json = response.json()
    pprint.pprint(response_json)
    feeRate = int(response_json['feerate_percentiles'][0]) + 0.1
    return feeRate

# sys.exit(1)
while True:
    feeRate1 = getFeeRate()
    response = requests.get(url)
    response_json = response.json()
    withdraw_requests = response_json['withdrawRequests'] ##real code
    i1 = 0
    deleteDupes = []

    if isMainnet:
        ordCommand = [ordPath, "wallet", "--name", ordWalletName, "balance"]
    else:
        ordCommand = [ordPath, "--signet", "wallet", "balance"]

    result = subprocess.run(ordCommand, shell=True, capture_output=True, text=True, encoding="UTF-8")
    balanceList = json.loads(result.stdout)
    
    runesOwned = balanceList['runes']
    cardinalOwned = balanceList['cardinal']
    print("runesOwned", runesOwned)
    print("cardinalOwned", cardinalOwned)

    if len(withdraw_requests) == 0:
        print("sent all")
        time.sleep(60)
        continue

    if cardinalOwned < (2000 * len(withdraw_requests)):
        print("insufficient fee fund")
        time.sleep(60)
        continue

    for x in withdraw_requests: ##selects ids that are dupes
        if x in totalTransactionsList.values():
            deleteDupes.append(x)

    for y in deleteDupes: ##deletes those ids
        del withdraw_requests[y]

    print("withdraw_requests", withdraw_requests)
    
    ## find first valid withdraw request
    for key, value in withdraw_requests.items(): ##checks if there is sufficient runes, and if the transaction is sent (picks out transaction from the request from the server)
        ## TODO: use key, value instead of i1 
        # print(key, value)
        print(value.get("ticker"))
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

    ## server needs to publish only valid withdraws (e.g., amount > 0 or > minimum withdraw amount)
    amount = int(transactionInfo['amount'])
    targetAddress = transactionInfo['ordAddress']
    ticker = transactionInfo['ticker']

    ## have one valid withdraw request and move on
    
    ## send runes
    rune = f"{amount}:{ticker}"

    if isMainnet:
        command = [ordPath, "wallet", "--name", ordWalletName, "send", "--fee-rate",  feeRate1, targetAddress, rune,  "--postage", "330sat", "--dry-run"]
    else:
        command = [ordPath, "--signet", "wallet", "send", "--fee-rate",  feeRate1, targetAddress, rune,  "--postage", "330sat", "--dry-run"]

    if willBroadcast == True:
        command.pop() ## pop --dry-run so that ord will broadcast

    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    commandOutput = json.loads(result.stdout)
    print(result.stdout)
    transactionID = commandOutput["txid"]
    totalTransactionsList[transactionID] = idServer
    withdraw_requests[idServer]['sent'] = True
    sys.exit()
    time.sleep(60)