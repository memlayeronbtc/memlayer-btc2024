import { Server } from '@chainlink/ccip-read-server';
import { ethers } from 'ethers';
import fs from 'fs';
import mempoolJS from '@mempool/mempool.js';

// local dev
const dataFolder = '../evm-contracts/artifacts/contracts/MemlayerToken.sol/';

// // production - copy abi json to data
// // const dataFolder = './data/';
// // if (!fs.existsSync(dataFolder)) {
// //   fs.mkdirSync(dataFolder);
// // }

const gatewayABI = JSON.parse(
  fs.readFileSync(`${dataFolder}Gateway.json`, 'utf8')
).abi;

const memlayerABI = JSON.parse(
  fs.readFileSync(`${dataFolder}MemlayerToken.json`, 'utf8')
).abi;

export async function initMempoolData() {
  const depositAddress = process.env.DEPOSIT_ADDRESS;
  const serverUrl = process.env.SERVERLESS_URI;

  const {
    bitcoin: { websocket },
  } = mempoolJS({
    hostname: 'mempool.space',
  });

  // TODO: switch to a full node and watch mempool natively
  const ws = websocket.initServer({
    options: [
      "block"
    ],
  });

  ws.on('open', function() {
    ws.send(JSON.stringify({ 'track-address': depositAddress }));
    console.log('tracking deposit address', depositAddress);
  });

  ws.on('message', function incoming(data: any) {
    const res = JSON.parse(data.toString());
    console.log(res);

    // unconfirmed
    if (res['address-transactions']) {
      fetch(`${serverUrl}/pushbatchtxs`, {
        method: 'POST',
        body: JSON.stringify({
          txtype: 'addressTX',
          txstring: JSON.stringify(res['address-transactions']),
          passcode: process.env.PASSCODE_pushbatchtxs,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
    }

    // confirmed
    if (res['block-transactions']) {
      fetch(`${serverUrl}/pushbatchtxs`, {
        method: 'POST',
        body: JSON.stringify({
          txtype: 'blockTX',
          txstring: JSON.stringify(res['address-transactions']),
          passcode: process.env.PASSCODE_pushbatchtxs,
        }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
    }
  });
}

export function makeApp(privateKey: string, path: string) {
  const signer = new ethers.Wallet(privateKey);
  const server = new Server();
  const serverUrl = process.env.SERVERLESS_URI;
  server.add(gatewayABI, [
    {
      type: 'getSignedRunicBalance',
      func: async (args: ethers.utils.Result) => {
        let balance: number = 0;
        let confirmedCredit: number = 0;
        let unconfirmedCredit: number = 0;
        let claimedCredit: number = 0;
        const [addr, ticker] = args;
        console.log(ticker);
        // const ticker = 'MEMLAYER•CREDIT';

        const ethAddress = addr.toLowerCase();
        console.log('getSignedRunicBalance', ethAddress);

        const res0 = await fetch(
          `${serverUrl}/getoffchainpairing?ethAddress=${ethAddress}`
        );
        const resJson0 = await res0.json();
        // console.log(resJson);
        const btcAddress = resJson0?.ordAddress;
        console.log('btcAddress', btcAddress);

        if (btcAddress) {
          const res = await fetch(
            `${serverUrl}/getbalance?runeAddress=${btcAddress}`
          );
          const resJson = await res.json();
          console.log(resJson);

          if (
            resJson["balance"].unconfirmedCredits[btcAddress] &&
            resJson["balance"].unconfirmedCredits[btcAddress][ticker]
          ) {
            unconfirmedCredit = resJson["balance"].unconfirmedCredits[btcAddress][ticker];
          }

          if (
            resJson["balance"].confirmedCredits[btcAddress] &&
            resJson["balance"].confirmedCredits[btcAddress][ticker]
          ) {
            confirmedCredit = resJson["balance"].confirmedCredits[btcAddress][ticker];
          }
        }

        // get token detail
        const resRuneInfo = await fetch(
          `${serverUrl}/getlifts?ticker=${ticker}`
        );
        const runeInfo = await resRuneInfo.json();
        console.log(runeInfo);

        const funcSigner = new ethers.Wallet(
          privateKey,
          new ethers.providers.JsonRpcProvider(runeInfo['chainRPC'])
        );

        const MemlayerToken: any = new ethers.Contract(
          runeInfo['contractAddress'],
          memlayerABI,
          funcSigner
        );

        claimedCredit = Number(ethers.utils.formatEther(await MemlayerToken.getClaimedBalance(ethAddress)));
        // const liftAmount = runeInfo["amount"];

        console.log('confirmedCredit', confirmedCredit);
        console.log('unconfirmedCredit', unconfirmedCredit);
        console.log('claimedCredit', claimedCredit);

        balance = confirmedCredit + unconfirmedCredit - claimedCredit;

        if (balance < 0) {
          balance = 0;
        }

        console.log('claimable balance', balance);

        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256'],
          [balance]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [balance, signature];
      },
    },
    {
      type: 'getPairedOrdAddress',
      func: async (args: ethers.utils.Result) => {
        const [addr] = args;
        const ethAddress = addr.toLowerCase();
        console.log('getPairedOrdAddress', ethAddress);

        const res = await fetch(
          `${serverUrl}/getoffchainpairing?ethAddress=${ethAddress}`
        );
        const resJson = await res.json();
        const btcAddr = resJson?.ordAddress;
        console.log('btcAddr', btcAddr);
        let messageHash = ethers.utils.solidityKeccak256(['string'], [btcAddr]);
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [btcAddr, signature];
      },
    },
    {
      type: 'getPairedEthAddress',
      func: async (args: ethers.utils.Result) => {
        const [addr] = args;
        const btcAddr = addr.toLowerCase();
        console.log('getPairedEthAddress', btcAddr);

        const res = await fetch(
          `${serverUrl}/getoffchainpairing?runeAddress=${btcAddr}`
        );
        const resJson = await res.json();
        const ethAddr = resJson?.ethAddress;
        console.log('ethAddr', ethAddr);
        let messageHash = ethers.utils.solidityKeccak256(
          ['address'],
          [ethAddr]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [ethAddr, signature];
      },
    },
    {
      type: 'claimSignedRunicBalance',
      func: async (args: ethers.utils.Result) => {
        let balance: number = 0;
        let confirmedCredit: number = 0;
        let unconfirmedCredit: number = 0;
        let claimedCredit: number = 0;
        const [addr, ticker] = args;
        console.log(ticker);

        const ethAddress = addr.toLowerCase();
        console.log('claimSignedRunicBalance', ethAddress);

        const res0 = await fetch(
          `${serverUrl}/getoffchainpairing?ethAddress=${ethAddress}`
        );
        const resJson0 = await res0.json();
        // console.log(resJson);
        const btcAddress = resJson0?.ordAddress;
        console.log('btcAddress', btcAddress);

        if (btcAddress) {
          const res = await fetch(
            `${serverUrl}/getbalance?runeAddress=${btcAddress}`
          );
          const resJson = await res.json();
          console.log(resJson);

          if (
            resJson["balance"].unconfirmedCredits[btcAddress] &&
            resJson["balance"].unconfirmedCredits[btcAddress][ticker]
          ) {
            unconfirmedCredit = resJson["balance"].unconfirmedCredits[btcAddress][ticker];
          }

          if (
            resJson["balance"].confirmedCredits[btcAddress] &&
            resJson["balance"].confirmedCredits[btcAddress][ticker]
          ) {
            confirmedCredit = resJson["balance"].confirmedCredits[btcAddress][ticker];
          }
        }

        // get token detail
        const resRuneInfo = await fetch(
          `${serverUrl}/getlifts?ticker=${ticker}`
        );
        const runeInfo = await resRuneInfo.json();
        console.log(runeInfo);

        const funcSigner = new ethers.Wallet(
          privateKey,
          new ethers.providers.JsonRpcProvider(runeInfo['chainRPC'])
        );

        const MemlayerToken: any = new ethers.Contract(
          runeInfo['contractAddress'],
          memlayerABI,
          funcSigner
        );

        claimedCredit = Number(ethers.utils.formatEther(await MemlayerToken.getClaimedBalance(ethAddress)));
        // const liftAmount = runeInfo["amount"];

        console.log('confirmedCredit', confirmedCredit);
        console.log('unconfirmedCredit', unconfirmedCredit);
        console.log('claimedCredit', claimedCredit);

        balance = confirmedCredit - claimedCredit;

        if (balance < 0) {
          balance = 0;
        } else {
          console.log('claimable balance', balance, runeInfo['chain']);

          let gasSettings = {}
          if (runeInfo['chain'] === "RootstockTestnet") {
            
          } else if (runeInfo['chain'] === "awsaga") {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits('0.01', 'gwei'),
              maxPriorityFeePerGas: ethers.utils.parseUnits('0.00000001', 'gwei'), //0.00000001? for saga?
            }
          } else {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits('0.01', 'gwei'),
              maxPriorityFeePerGas: ethers.utils.parseUnits('0.0001', 'gwei'), //0.00000001? for saga?
            }
          }
          const tx = await MemlayerToken.connect(funcSigner).liftRunes(
            ethAddress,
            Math.floor(balance), gasSettings
          );
          await tx.wait();
        }

        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256'],
          [balance]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [balance, signature];
      },
    },
    {
      type: 'withdrawSignedRunicBalance',
      func: async (args: ethers.utils.Result) => {
        let balance: number = 0;
        let confirmedCredit: number = 0;
        let unconfirmedCredit: number = 0;
        let claimedCredit: number = 0;
        const [addr, ticker, amount] = args;
        const withdrawAmount = Math.floor(Number(ethers.utils.formatEther(amount)));
        console.log("----")
        console.log('withdraw ticker', ticker);
        console.log('withdraw amount', withdrawAmount);
        // const ticker = 'MEMLAYER•CREDIT';

        const ethAddress = addr.toLowerCase();
        console.log('withdrawSignedRunicBalance', ethAddress);

        const res0 = await fetch(
          `${serverUrl}/getoffchainpairing?ethAddress=${ethAddress}`
        );
        const resJson0 = await res0.json();
        // console.log(resJson);
        const btcAddress = resJson0?.ordAddress;
        console.log('btcAddress', btcAddress);

        if (btcAddress) {
          const res = await fetch(
            `${serverUrl}/getbalance?runeAddress=${btcAddress}`
          );
          const resJson = await res.json();

          if (
            resJson["balance"].unconfirmedCredits[btcAddress] &&
            resJson["balance"].unconfirmedCredits[btcAddress][ticker]
          ) {
            unconfirmedCredit = resJson["balance"].unconfirmedCredits[btcAddress][ticker];
          }

          if (
            resJson["balance"].confirmedCredits[btcAddress] &&
            resJson["balance"].confirmedCredits[btcAddress][ticker]
          ) {
            confirmedCredit = resJson["balance"].confirmedCredits[btcAddress][ticker];
          }
        }

        // get token detail
        const resRuneInfo = await fetch(
          `${serverUrl}/getlifts?ticker=${ticker}`
        );
        const runeInfo = await resRuneInfo.json();
        console.log(runeInfo);

        const funcSigner = new ethers.Wallet(
          privateKey,
          new ethers.providers.JsonRpcProvider(runeInfo['chainRPC'])
        );

        const MemlayerToken: any = new ethers.Contract(
          runeInfo['contractAddress'],
          memlayerABI,
          funcSigner
        );

        claimedCredit = Number(ethers.utils.formatEther(await MemlayerToken.getClaimedBalance(ethAddress)));

        console.log('confirmedCredit', confirmedCredit);
        console.log('unconfirmedCredit', unconfirmedCredit);
        console.log('claimedCredit', claimedCredit);
        console.log('claimedCredit', claimedCredit);
        console.log('withdrawAmount', withdrawAmount);

        await fetch(`${serverUrl}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({
            ordAddress: btcAddress,
            ticker,
            amount: withdrawAmount,
            fromEthAddress: ethAddress,
            network: runeInfo['chain'],
            passcode: process.env.PASSCODE_withdraw,
          }),
          headers: {
            'Content-type': 'application/json; charset=UTF-8',
          },
        });

        balance = confirmedCredit - claimedCredit;

        if (balance < 0) {
          balance = 0;
        }

        console.log('claimable balance', balance);

        let messageHash = ethers.utils.solidityKeccak256(
          ['uint256'],
          [balance]
        );
        let messageHashBinary = ethers.utils.arrayify(messageHash);
        const signature = await signer.signMessage(messageHashBinary);
        return [balance, signature];
      },
    }
  ]);
  return server.makeApp(path);
}
