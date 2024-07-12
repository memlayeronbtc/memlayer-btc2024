const axios = require('axios');
const { Runestone } = require('runelib');
const {execSync} = require('child_process');
var qs = require('qs');

const receivingAddress = "tb1pvd34y8hx2ja3rx7alc4rj77n8dgwl4k98ut29aua08720xte63pqe42rnk"; // whichever address is the receiver
const isMainnet = false;
var sentTransactions = [];

async function getEthAddress(senderAddress_) {
    const url = `https://us-central1-memlayer.cloudfunctions.net/getoffchainpairing?runeAddress=${senderAddress_}`;
    const res = await axios.get(url);
    const resJson = res.data;
    const ethAddress_ = resJson.ethAddress
    console.log(resJson.ethAddress)
    return ethAddress_
}

function getTransactionInfo(receivingAddress_, isMainnet, sentTransactions_) {
    let savedTransactions = [];
    let commandStartCli;
    let commandOrd;
    if (isMainnet) {
        commandStartCli = `"D:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe"`;
        commandOrd = `"D:\\code\\ord-0.18.5\\ord.exe" wallet transactions --limit 50`
    } 
    else {
        commandStartCli = `"D:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe" -signet`;
        commandOrd = `"D:\\code\\ord-0.18.5\\ord.exe" --signet wallet transactions --limit 50`;
    }

    try {
        const transactionListRes = execSync(commandOrd, { encoding: 'utf-8' });
        const transactionsOrdJson = JSON.parse(transactionListRes);
        const transactionList = [];

        transactionsOrdJson.forEach(transactionObj => {
            const ordTransactionId =  transactionObj.transaction
            if (!sentTransactions_.includes(ordTransactionId)) {
                transactionList.push(transactionObj.transaction);
            }
        });

        for (const transactionId of transactionList) {
            const getTransactionCommand = `${commandStartCli} getrawtransaction ${transactionId} true`;
            const transactionResult = execSync(getTransactionCommand, { encoding: 'utf-8' });
            const transactionInfo = JSON.parse(transactionResult);
            const transactionVout = transactionInfo.vout;

            for (const vout of transactionVout) {
                if (vout.scriptPubKey.address === receivingAddress_) {
                    const vin0 = transactionInfo.vin[0];
                    const txid0 = vin0.txid;
                    const vout0 = vin0.vout;
                    const rawtx_ = transactionInfo.hex;

                    getSenderAddressCommand = `${commandStartCli} getrawtransaction ${txid0} true`;
                    const senderAddressResult = execSync(getSenderAddressCommand, { encoding: 'utf-8' });
                    const senderAddressInfo = JSON.parse(senderAddressResult);
                    const senderVout =  senderAddressInfo.vout[vout0];
                    const senderAddress = senderVout.scriptPubKey.address;
                    savedTransactions.push({ senderAddress, rawtx_, transactionId });
                }
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
    return savedTransactions;
}

function decodeRune(rawtx0) {
    try {
        const stone = Runestone.decipher(rawtx0);
        console.log(stone._value.edicts);
        const edict = stone._value.edicts;

        const amount = edict[0].amount;
        const block = edict[0].id.block;
        const idx = edict[0].id.idx;
        const runeId = `${block}:${idx}`;
        return {runeId, amount};
    }
    catch (error) {
        console.error(`error: ${error.message}`);
        return false
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
    
async function postTransactionInfo(ethAddress_, runeAddress_, runeId_, amount_) {
    var data = {
        'passcode': 'dbeb0hfde3acc323',
        'ethAddress': ethAddress_,
        'runeAddress': runeAddress_,
        'runeId': runeId_,
        'amount': amount_
        }
    var dataString = qs.stringify(data);
    var config = {
    method: 'post',
    url: 'http://127.0.0.1:5001/memlayer/us-central1/liftturborunes',
    headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    data : dataString
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
    while (true){
        const transactions = getTransactionInfo(receivingAddress, isMainnet, sentTransactions);

        for (let i = 0; i < transactions.length; i++) {
            const returnRune = decodeRune(transactions[i].rawtx_);
            if (!returnRune) {
                transactions.splice(i, 1);
            }
            else {
                const ethaddress = getEthAddress(transactions[i].senderAddress);
                transactions[i].ethaddress = ethaddress;
                transactions[i].amount = returnRune.amount;
                transactions[i].runeId = returnRune.runeId;
                console.log("ethaddress", ethaddress);
            }
        }

        for (const transaction of transactions) {
            await postTransactionInfo(transaction.ethAddress, transaction.senderAddress, transaction.amount, transaction.runeId);
            sentTransactions.push(transaction.transactionId);
            await sleep(5000); 
        }

        await sleep(20000);
    }
})();