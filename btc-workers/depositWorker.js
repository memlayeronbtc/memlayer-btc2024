const axios = require("axios");
const { Runestone } = require("runelib");
const { execSync } = require("child_process");
const qs = require("qs");

const depositAddress = "bc1p6nfc2danj9wuwn5n63eqcwx354ww5yym5pyl7egfmzdgk8h4kuwsay8pw2";
const firebaseServerUri = "https://us-central1-memlayer.cloudfunctions.net";
const isMainnet = true;
var sentTransactions = [];

// get ETH address from BTC ord address assuming they paired before
// async function getEthAddress(senderAddress_) {
//   const url = `${firebaseServerUri}/getoffchainpairing?runeAddress=${senderAddress_}`;
//   const res = await axios.get(url);
//   const resJson = res.data;
//   if (resJson.ethAddress) {
//     return resJson.ethAddress;
//   } else {
//     return null;
//   }
// }

// based on receiving address, get a list of TXs with sender addresses and rawTX for further processing
function getTransactionInfo(depositAddress_, isMainnet, sentTransactions_) {
  let savedTransactions = {};
  let commandStartCli;
  let commandOrd;
  if (isMainnet) {
    commandStartCli = `"C:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe" -rpcwallet=memlayer0`;
    commandOrd = `"C:\\code\\ordinals-ord\\target\\release\\ord.exe" wallet --name memlayer0 transactions --limit 50`;
  } else {
    commandStartCli = `"D:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe" -signet`;
    commandOrd = `"D:\\code\\ord-0.18.5\\ord.exe" --signet wallet transactions --limit 50`;
  }

  // try {
  const transactionListRes = execSync(commandOrd, { encoding: "utf-8" });
  const transactionList = JSON.parse(transactionListRes);
  // const transactionList = [];

  // transactionsOrdJson.forEach((transactionObj) => {
  //   const ordTransactionId = transactionObj.transaction;
  //   if (!sentTransactions_.includes(ordTransactionId)) {
  //     transactionList.push(transactionObj);
  //   }
  // });

  // console.log(Object.keys(transactionList))

  for (const tx in transactionList) {
    if (transactionList[tx].transaction in sentTransactions) {
      continue
    }

    if (transactionList[tx].confirmations > 3) {
      continue
    }

    const getTransactionCommand = `${commandStartCli} getrawtransaction ${transactionList[tx].transaction} true`;
    const transactionResult = execSync(getTransactionCommand, {
      encoding: "utf-8",
    });
    const transactionInfo = JSON.parse(transactionResult);
    const transactionVout = transactionInfo.vout;

    for (const vout of transactionVout) {
      if (vout.scriptPubKey.address === depositAddress_) {
        const vin0 = transactionInfo.vin[0];
        const txid0 = vin0.txid;
        const vout0 = vin0.vout;
        const rawtx_ = transactionInfo.hex;

        getSenderAddressCommand = `${commandStartCli} getrawtransaction ${txid0} true`;
        const senderAddressResult = execSync(getSenderAddressCommand, {
          encoding: "utf-8",
        });
        const senderAddressInfo = JSON.parse(senderAddressResult);
        const senderVout = senderAddressInfo.vout[vout0];
        const senderAddress = senderVout.scriptPubKey.address;
        savedTransactions[transactionList[tx].transaction] = {
          senderAddress,
          rawtx_,
          "transactionId": transactionList[tx].transaction,
          "confirmations": transactionList[tx].confirmations
        };
      }
    }
  }
  // } catch (error) {
  //     console.error(`Error: ${error.message}`);
  // }
  return Object.values(savedTransactions);
}

// parse rune raw data into rune id and amount
function decodeRune(rawtx0) {
  // try {
  const stone = Runestone.decipher(rawtx0);
  // console.log(stone._value.edicts);
  const edict = stone._value.edicts;

  const amount = edict[0].amount;
  const block = edict[0].id.block;
  const idx = edict[0].id.idx;
  const runeId = `${block}:${idx}`;
  return { runeId, amount };
  // }
  // catch (error) {
  //     console.error(`error: ${error.message}`);
  //     return false
  // }
}

// sleep for miliseconds
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ask server to lift rune received to EVM
async function postTransactionInfo(
  // ethAddress_,
  runeAddress_,
  runeId_,
  amount_,
  txid_
) {
  var data = {
    passcode: "dbeb0hfde3acc323",
    // ethAddress: ethAddress_,
    runeAddress: runeAddress_,
    runeId: runeId_,
    amount: amount_,
    txid: txid_
  };
  var dataString = qs.stringify(data);
  var config = {
    method: "post",
    url: `${firebaseServerUri}/liftturborunes`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: dataString,
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
}

(async () => {
  while (true) {
    const transactions = getTransactionInfo(
      depositAddress,
      isMainnet,
      sentTransactions,
    );
    // console.log(transactions)

    for (let i = 0; i < transactions.length; i++) {
      const returnRune = decodeRune(transactions[i].rawtx_);
      if (!returnRune) {
        transactions.splice(i, 1);
      } else {
        // const ethaddress = await getEthAddress(transactions[i].senderAddress);

        // if (ethaddress) {
        //   transactions[i].ethaddress = ethaddress;
        //   // console.log("ethaddress", ethaddress);
        // }
        transactions[i].amount = returnRune.amount;
        transactions[i].runeId = returnRune.runeId;
      }
    }
    console.log(transactions);

    // break;
    for (const transaction of transactions) {
      await postTransactionInfo(
        // transaction.ethAddress,
        transaction.senderAddress,
        transaction.amount,
        transaction.runeId,
        transaction.transactionId,
        transaction.confirmations
      );
      sentTransactions.push(transaction.transactionId);
      await sleep(2000);
    }

    await sleep(20000);
  }
})();
