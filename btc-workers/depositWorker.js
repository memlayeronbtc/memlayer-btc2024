const axios = require('axios');
const { Runestone } = require('runelib');
const {execSync} = require('child_process');

const receivingAddress = "tb1pa7mpplj2x2790q0ykhs0rjyrsterxx25tg9qcl3nqu7g9mjp4wpqxkrsve"; // whichever address is the receiver
const isMainnet = false;

function getTransactionInfo(receivingAddress_, isMainnet) {
    let savedTransactions = [];
    let commandStart;
    if (isMainnet) {
        commandStart = `"D:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe"`;
    } 
    else {
        commandStart = `"D:\\Program Files\\Bitcoin\\daemon\\bitcoin-cli.exe" -signet`;
    }
    
    try {
        const getMempoolCommand = `${commandStart} getrawmempool`;
        const mempoolResult = execSync(getMempoolCommand, { encoding: 'utf-8' });
        const mempoolJson = JSON.parse(mempoolResult);

        for (const transaction of mempoolJson) {
            const getTransactionCommand = `${commandStart} getrawtransaction ${transaction} true`;
            const transactionResult = execSync(getTransactionCommand, { encoding: 'utf-8' });
            const transactionInfo = JSON.parse(transactionResult);
            const transactionVout = transactionInfo.vout;

            for (const vout of transactionVout) {
                if (vout.scriptPubKey.address === receivingAddress_) {
                    const vin0 = transactionInfo.vin[0];
                    const txid0 = vin0.txid;
                    const vout0 = vin0.vout;
                    const rawtx_ = transactionInfo.hex;

                    getSenderAddressCommand = `${commandStart} getrawtransaction ${txid0} true`;
                    const senderAddressResult = execSync(getSenderAddressCommand, { encoding: 'utf-8' });
                    const senderAddressInfo = JSON.parse(senderAddressResult);
                    const senderVout =  senderAddressInfo.vout[vout0];
                    const senderAddress = senderVout.scriptPubKey.address;

                    savedTransactions.push({ senderAddress, rawtx_ });
                }
            }
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
    return savedTransactions;
}

function decodeRune(rawtx0) {
    const stone = Runestone.decipher(rawtx0);
    console.log(stone._value.edicts);
    const edict = stone._value.edicts;

    const amount = edict[0].amount;
    const block = edict[0].id.block;
    const idx = edict[0].id.idx;
    const runeId = `${block}:${idx}`

    return {runeId, amount};
    }


transactions = getTransactionInfo(receivingAddress, isMainnet);

const rawtx = transactions[0].rawtx_;
const decodedRune = decodeRune(rawtx);

const output = {
    "senderAddress" : transactions[0].senderAddress,
    "runeID" : decodedRune.runeId,
    "amount" : decodedRune.amount
}

console.log(output)