const { ethers } = require("ethers");
const cors = require("cors")({ origin: true });

const admin = require("firebase-admin");
const functions = require("firebase-functions");

const { Runestone } = require("runelib");
const mempoolJS = require("@mempool/mempool.js");

const MemlayerTokenABI = require("./abi/MemlayerTokenABI.json");

admin.initializeApp({
  databaseURL: functions.config().db.uri
});

function removeEmpty(obj) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v != null)
      .map(([k, v]) => [k, v === Object(v) ? removeEmpty(v) : v]),
  );
}

const parseRunestone = async (tx) => {
  let runes = [];
  const {
    bitcoin: { transactions },
  } = mempoolJS({
    hostname: "mempool.space", //self host?
  });

  const result = {};
  const mempoolRequests = ["status", "rbf", "raw"];
  for (const i in mempoolRequests) {
    // console.log(i);
    const mempoolUri = `https://mempool.space/api/${mempoolRequests[i] === "rbf" ? "v1/" : ""}tx/${tx}/${mempoolRequests[i]}`;
    const res = await fetch(mempoolUri);

    if (mempoolRequests[i] !== "raw") {
      const resJson = removeEmpty(await res.json());
      if (Object.keys(resJson).length > 0) {
        result[mempoolRequests[i]] = resJson;
      }
    } else {
      const resHexString = await res.arrayBuffer();

      const stone = Runestone.decipher(resHexString);
      for (const i in stone._value["edicts"]) {
        const edict = stone._value["edicts"][i];
        const runeId = `${edict.id.block}:${edict.id.idx}`;

        runes.push({
          runeId: runeId,
          amount: Number(edict.amount),
        });
      }
      result["runes"] = runes;
    }
  }
  return result;
};

exports.getRunesFromTx = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const tx = req.query.txid;
    if (!tx) {
      return res.status(200).send({
        success: false,
        msg: "invalid txid",
      });
    }
    switch (req.method) {
      case "GET":
        try {
          const result = await parseRunestone(tx);
          return res.status(200).send({
            tx,
            success: true,
            ...result,
          });
        } catch (error) {
          return res.status(200).send({
            success: false,
            msg: "oops",
          });
        }
    }
  });
});
// pairing for memlayer
exports.pairing = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    switch (req.method) {
      case "POST": // handle POST request
        const data = req.body;

        const passcode = data.passcode;
        const ethAddress = data.ethAddress;
        const runeAddress = data.runeAddress;

        if (!passcode || passcode !== functions.config().passcode.pairing) {

          return res.status(200).send({ success: false, msg: "invalid input" });
        }

        if (!runeAddress?.startsWith("bc1p") || !ethAddress) {
          return res.status(200).send({
            success: false,
            msg: "invalid inputs",
          });
        }

        if (!ethers.utils.isAddress(ethAddress)) {
          console.log("invalid ethAddress");
          return res.status(200).send({
            success: false,
            msg: "invalid ethAddress",
          });
        }

        const updateData = {
          ordAddress: runeAddress.toLowerCase(),
          ethAddress: ethAddress.toLowerCase(),
          lastUpdate: Date.now(),
          msg: "paired",
        };

        admin
          .database()
          .ref(`/ordUserCredential/${runeAddress.toLowerCase()}`)
          .update(updateData);

        admin
          .database()
          .ref(`/ethUserCredential/${ethAddress.toLowerCase()}`)
          .update(updateData);

        return res.status(200).send({
          success: true,
          lastUpdate: Date.now(),
          runeAddress,
          ethAddress,
        });
        break;
    }
  });
});

// pairing for memlayer
exports.checkpairing = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    return res.status(200).send({
      success: false,
      msg: "invalid",
    });
  });
});

// TODO: make it more generic to claim any claimable balance
exports.claim = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    switch (req.method) {
      case "POST": // handle POST request
        const data = req.body;

        const passcode = data.passcode;
        const ethAddress = data.ethAddress;
        const runeAddress = data.runeAddress;
        const ticker = data.ticker;

        if (!passcode || passcode !== functions.config().passcode.claim) {
          
          return res.status(200).send({ success: false, msg: "invalid input" });
        }

        if (!runeAddress?.startsWith("bc1p")) {
          return res.status(200).send({
            success: false,
            msg: "invalid ord address",
          });
        }

        if (!ethers.utils.isAddress(ethAddress)) {
          console.log("invalid ethAddress");
          return res.status(200).send({
            success: false,
            msg: "invalid ethAddress",
          });
        }

        const result = await getbalancedb(runeAddress);
        const { claimables, runesData } = await parseBalance(
          runeAddress,
          result,
        );
        console.log("claiming to EVM address", ethAddress);
        console.log("claimables", claimables);
        // console.log("runesData", runesData);

        let rune;
        for (const index in runesData) {
          if (runesData[index].ticker === ticker) {
            rune = runesData[index];
            break;
          }
        }
        console.log("checking...", rune.ticker);
        console.log("confirmed", rune.confirmed);
        console.log("unconfirmed", rune.unconfirmed);
        const claimable = rune.confirmed;
        console.log("claimable", claimable);
        console.log(rune);

        const provider = new ethers.providers.JsonRpcProvider(
          rune["lifts"][0].chainRPC,
        );

        const signer = new ethers.Wallet(
          functions.config().operator.pkey,
          provider,
        );

        const memlayerTokenContract = new ethers.Contract(
          rune["lifts"][0].contractAddress,
          MemlayerTokenABI,
          signer,
        );

        const runicBalance = Number(
          await memlayerTokenContract.runicBalance(ethAddress, {
            ccipReadEnabled: true,
          }),
        );
        console.log("runicBalance", runicBalance);

        try {
          let gasSettings = {};
          if (rune["lifts"][0]["chain"] === "rskTestnet") {
          } else if (rune["lifts"][0]["chain"] === "awsaga") {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
              maxPriorityFeePerGas: ethers.utils.parseUnits(
                "0.00000001",
                "gwei",
              ), //0.00000001? for saga?
            };
          } else {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
              maxPriorityFeePerGas: ethers.utils.parseUnits("0.0001", "gwei"), //0.00000001? for saga?
            };
          }
          if (runicBalance > 0) {
            const tx = await memlayerTokenContract
              .connect(signer)
              .liftRunes(ethAddress, 100, gasSettings);
            // .liftRunes(ethAddress, runicBalance, gasSettings);
            await tx.wait();
          }
        } catch (error) {
          console.log(error);
          // return res.status(200).send({ success: false, msg: "oops" });
        }

        return res
          .status(200)
          .send({ success: true, msg: "claimed successfully" });
        break;
    }
  });
});

// offchain pairing for memlayer
exports.getoffchainpairing = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const runeAddress = req.query.runeAddress;
    const ethAddress = req.query.ethAddress;

    switch (req.method) {
      case "GET":
        let dbPath, snapshot, result, matched;
        let paired = false;
        let hasClaimableCredits = 0;
        const balance = {};
        let runes = [];

        // has ethAddress
        if (ethAddress) {
          if (!ethers.utils.isAddress(ethAddress)) {
            console.log("invalid ethAddress");
            return res.status(200).send({
              success: false,
              msg: "invalid ethAddress",
            });
          }
          dbPath = "ethUserCredential";
          snapshot = await admin
            .database()
            .ref(`/${dbPath}/${ethAddress.toLowerCase()}`)
            .once("value");
          result = snapshot.val();
          console.log(result);
          if (result && result.ordAddress) {
            paired = true;
            // has runeAddress
            if (runeAddress && result.ordAddress === runeAddress) {
              matched = true;
            }
            const resultDb = await getbalancedb(result.ordAddress);
            // console.log("result", result);
            const { claimables, runesData } = await parseBalance(
              result.ordAddress,
              resultDb,
            );
            // console.log("claimables", claimables);
            // console.log("runesData", runesData);
            hasClaimableCredits = claimables;
            runes = runesData;
          } else {
            // no pairing result
            const updateData = {
              msg: "pending eth signup",
              lastUpdate: Date.now(),
            };
            admin
              .database()
              .ref(`/ethUserCredential/${ethAddress.toLowerCase()}`)
              .update(updateData);
          }
        } else if (runeAddress) {
          if (!runeAddress?.startsWith("bc1p")) {
            return res.status(200).send({
              success: false,
              msg: "invalid ord address",
            });
          }
          dbPath = "ordUserCredential";
          snapshot = await admin
            .database()
            .ref(`/${dbPath}/${runeAddress.toLowerCase()}`)
            .once("value");
          result = snapshot.val();
          if (result && result.ethAddress) {
            paired = true;
            // has runeAddress
            if (ethAddress && result.ethAddress === ethAddress) {
              matched = true;
            }
            const resultDb = await getbalancedb(runeAddress);
            // console.log("result", result);
            const { claimables, runesData } = await parseBalance(
              runeAddress,
              resultDb,
            );
            // console.log("claimables", claimables);
            // console.log("runesData", runesData);
            hasClaimableCredits = claimables;
            runes = runesData;
            // }
          } else {
            // no pairing result
            const updateData = {
              msg: "pending ord signup",
              lastUpdate: Date.now(),
            };
            admin
              .database()
              .ref(`/ordUserCredential/${runeAddress.toLowerCase()}`)
              .update(updateData);
          }
        }

        return res.status(200).send({
          success: paired,
          paired,
          matched,
          hasClaimableCredits,
          lastUpdate: Date.now(),
          ...result,
          runes,
        });
        break;
    }
  });
});

exports.getlifts = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const ticker = req.query.ticker;

    switch (req.method) {
      case "GET":
        const snapshot = await admin.database().ref(`/lifting/`).once("value");
        const result = snapshot.val();

        if (ticker) {
          let token = {};
          for (const [key, value] of Object.entries(result)) {
            // console.log(`${key}: ${value.ticker}`);
            if (value.ticker === ticker) {
              token = value;
              break;
            }
          }

          if (!("lifts" in token)){
            return res.status(200).send({
              success: false,
              msg: "need to setup chain RPC info in firebase",
              lastUpdate: Date.now(),
            });
          }

          const lift = token?.lifts[0];
          
          delete token.lifts;

          return res.status(200).send({
            success: true,
            lastUpdate: Date.now(),
            ...token,
            ...lift,
          });
        } else {
          return res.status(200).send({
            success: false,
            lastUpdate: Date.now(),
          });
        }
        break;
    }
  });
});

// pairing for memlayer
exports.pushtx = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // TODO: need to limit to same origin
    switch (req.method) {
      case "POST": // handle POST request
        try {
          const data = req.body;
          const txtype = data.txtype;
          const txid = data.txid;
          const txjson = JSON.parse(data.txstring);

          if (txtype === "addressTX") {
            // unconfirmed
            admin.database().ref(`/unconfirmedTX/${txid}}`).update(txjson);
          }

          if (txtype === "blockTX") {
            // confirmed
            admin.database().ref(`/confirmedTX/${txid}}`).update(txjson);
          }

          return res.status(200).send({
            success: true,
            lastUpdate: Date.now(),
            txid,
            txtype,
            data: txjson,
          });
        } catch (error) {
          return res.status(200).send({
            success: false,
            lastUpdate: Date.now(),
          });
        }
    }
  });
});

// pairing for memlayer
exports.pushbatchtxs = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // TODO: need to limit to same origin
    switch (req.method) {
      case "POST": // handle POST request
        try {
          const data = req.body;
          const passcode = data.passcode;
          if (!passcode || passcode !== functions.config().passcode.pushbatchtxs) {
            return res.status(200).send({
              success: false,
              lastUpdate: Date.now(),
            });
          }
          const txtype = data.txtype;
          const txsdata = JSON.parse(data.txstring);

          // console.log("data length", txsdata.length);
          const updateData = {};

          if (txtype === "addressTX") {
            // unconfirmed
            for (let index = 0; index < txsdata.length; index++) {
              updateData[txsdata[index]["txid"]] = txsdata[index];
            }
            admin.database().ref(`/unconfirmedTX/`).update(updateData);
          }

          if (txtype === "blockTX") {
            const unconfirmedData = {};
            // confirmed
            for (let index = 0; index < txsdata.length; index++) {
              updateData[txsdata[index]["txid"]] = txsdata[index];
              unconfirmedData[txsdata[index]["txid"]] = {};
            }
            admin.database().ref(`/confirmedTX/`).update(updateData);

            // TODO: remove txs in unconfirmed data
            admin.database().ref(`/unconfirmedTX/`).update(unconfirmedData);
          }

          return res.status(200).send({
            success: true,
            lastUpdate: Date.now(),
            txtype,
            data: updateData,
          });
        } catch (error) {
          return res.status(200).send({
            success: false,
            lastUpdate: Date.now(),
          });
        }
    }
  });
});

parseBalance = async (runeAddress, result) => {
  let balance = {};
  let hasClaimableCredits = 0;
  let runes = [];
  for (const [key, value] of Object.entries(result["unconfirmedCredits"])) {
    // console.log(`${key}: ${value}`);
    if (runeAddress && key.toLowerCase() === runeAddress.toLowerCase()) {
      for (const [k, v] of Object.entries(value)) {
        // console.log(`${k}: ${v}`);
        if (!(k in balance)) {
          balance[k] = {};
        }
        balance[k]["unconfirmed"] = v;
      }
      break;
    }
  }
  for (const [key, value] of Object.entries(result["confirmedCredits"])) {
    // console.log(`${key}: ${value}`);
    if (runeAddress && key.toLowerCase() === runeAddress.toLowerCase()) {
      for (const [k, v] of Object.entries(value)) {
        // console.log(`${k}: ${v}`);
        if (!(k in balance)) {
          balance[k] = {};
        }
        balance[k]["confirmed"] = v;
      }
      break;
    }
  }
  const snapshotLifts = await admin.database().ref(`/lifting/`).once("value");
  const resultLifts = snapshotLifts.val();
  for (const [k, v] of Object.entries(resultLifts)) {
    for (const [key, value] of Object.entries(balance)) {
      if (v.ticker === key) {
        const unconfirmedBalance = value["unconfirmed"]
          ? value["unconfirmed"]
          : 0;
        const confirmedBalance = value["confirmed"] ? value["confirmed"] : 0;
        hasClaimableCredits += confirmedBalance;
        runes.push({
          ticker: key,
          unconfirmed: unconfirmedBalance,
          confirmed: confirmedBalance,
          symbol: v.symbol,
          // chainRPC: v.chainRPC,
          // contractAddress: v.contractAddress,
          // chain: v.chain,
          lifts: v.lifts,
          number: v.number,
          // explorer: v.explorer,
          runeId: v.runeId,
          turbo: v.turbo,
        });
      }
    }
  }
  return { claimables: hasClaimableCredits, runesData: runes };
};

getbalancedb = async (runeAddress) => {
  const data = {};
  const unconfirmedCredits = {};
  const confirmedCredits = {};
  const snapshotRunes = await admin.database().ref(`/lifting/`).once("value");
  const liftingRunes = snapshotRunes.val();

  const snapshotConfirmed = await admin
    .database()
    .ref(`/confirmedTX/`)
    .once("value");
  const allConfirmedKeys = snapshotConfirmed.val()
    ? Object.keys(snapshotConfirmed.val())
    : [];
  const allConfirmedItems = snapshotConfirmed.val()
    ? Object.values(snapshotConfirmed.val())
    : [];

  // calculate balance every time
  // TODO: calculate every time RIGHT AFTER db update
  const snapshotUnconfirmed = await admin
    .database()
    .ref(`/unconfirmedTX/`)
    .once("value");
  const allUnconfirmedTXs = Object.values(snapshotUnconfirmed.val());

  // process confirmed TXs
  for (const tx of allConfirmedItems) {
    // credit to the first address
    const creditAddress =
      tx["vin"][0]["prevout"]["scriptpubkey_address"].toLowerCase();
    // iterate through outputs

    if (!(creditAddress in confirmedCredits)) {
      confirmedCredits[creditAddress] = {};
    }

    if (runeAddress && creditAddress !== runeAddress.toLowerCase()) {
      // skip if not sender
      continue;
    }

    const result = await parseRunestone(tx.txid);
    if (result.status.confirmed) {
      for (const i in result.runes) {
        const ticker = liftingRunes[result.runes[i].runeId]["ticker"];

        if (!(ticker in confirmedCredits[creditAddress])) {
          confirmedCredits[creditAddress][ticker] = 0;
        }
        confirmedCredits[creditAddress][ticker] += result.runes[i].amount;
      }
    }
  }

  for (const tx of allUnconfirmedTXs) {
    // if this tx was confirmed, skip
    if (allConfirmedKeys[tx["txid"]]) {
      continue;
    }

    // credit to the first address
    const creditAddress =
      tx["vin"][0]["prevout"]["scriptpubkey_address"].toLowerCase();
    // iterate through outputs

    if (!(creditAddress in unconfirmedCredits)) {
      unconfirmedCredits[creditAddress] = {};
    }

    if (!(creditAddress in confirmedCredits)) {
      confirmedCredits[creditAddress] = {};
    }

    if (runeAddress && creditAddress !== runeAddress.toLowerCase()) {
      // skip if not sender
      continue;
    }

    const result = await parseRunestone(tx.txid);

    for (const i in result.runes) {
      const ticker = liftingRunes[result.runes[i].runeId]["ticker"];

      // backlog confirmed tx in unconfirmed pool
      if (result.status.confirmed) {
        if (!(ticker in confirmedCredits[creditAddress])) {
          confirmedCredits[creditAddress][ticker] = 0;
        }
        confirmedCredits[creditAddress][ticker] += result.runes[i].amount;
      } else {
        if (!(ticker in unconfirmedCredits[creditAddress])) {
          unconfirmedCredits[creditAddress][ticker] = 0;
        }
        unconfirmedCredits[creditAddress][ticker] += result.runes[i].amount;
      }
    }
  }

  data["unconfirmedCredits"] = unconfirmedCredits;
  data["confirmedCredits"] = confirmedCredits;

  return data;
};

exports.getbalance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    switch (req.method) {
      case "GET":
        const runeAddress = req.query.runeAddress ? req.query.runeAddress : "";
        const result = await getbalancedb(runeAddress);
        return res.status(200).send({
          success: true,
          balance: result,
          lastUpdate: Date.now(),
        });
    }
  });
});

// memlayer server submit withdraw request
exports.withdraw = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // TODO: need to limit to same origin
    switch (req.method) {
      case "POST": // handle POST request
        const data = req.body;
        const ordAddress = data.ordAddress;
        const ticker = data.ticker;
        const amount = BigInt(data.amount);
        const fromEthAddress = data.fromEthAddress;
        const network = data.network;
        const passcode = data.passcode;

        if (
          !ordAddress ||
          !ticker ||
          !amount ||
          !fromEthAddress ||
          !network ||
          !passcode ||
          passcode !== functions.config().passcode.withdraw
        ) {
          return res.status(200).send({ success: false, msg: "invalid input" });
        }

        const withdrawData = {
          lastUpdate: Date.now(),
          ordAddress,
          ticker,
          amount: String(amount),
          fromEthAddress,
          network,
          confirmed: false,
          sent: false,
          sentTx: "",
        };

        admin.database().ref("/withdraw").push().set(withdrawData);

        return res.status(200).send({
          success: true,
          ...withdrawData,
          lastUpdate: Date.now(),
        });
    }
  });
});

exports.getwithdrawreq = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    switch (req.method) {
      case "GET":
        const snapshotWithdrawReq = await admin
          .database()
          .ref(`/withdraw/`)
          .once("value");
        return res.status(200).send({
          success: true,
          withdrawRequests: snapshotWithdrawReq.val(),
          lastUpdate: Date.now(),
        });
    }
  });
});

// operator finalize withdraw after checking L1 confirmation
exports.finalizewithdraw = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const ethAddress = req.query.ethAddress;
    const ticker = req.query.ticker;
    const toFinalize = req.query.toFinalize === "true" ? true : false;

    const snapshot = await admin.database().ref(`/lifting/`).once("value");
    const result = snapshot.val();

    if (!ticker || !ethAddress) {
      res.status(200).send({
        success: false,
        lastUpdate: Date.now(),
      });
    }
    let rune = {};
    for (const [key, value] of Object.entries(result)) {
      // console.log(`${key}: ${value.ticker}`);
      if (value.ticker === ticker) {
        rune = value;
        break;
      }
    }

    console.log("checking...", rune.ticker);
    console.log(rune);

    const provider = new ethers.providers.JsonRpcProvider(
      rune["lifts"][0].chainRPC,
    );

    const signer = new ethers.Wallet(
      functions.config().operator.pkey,
      provider,
    );

    const memlayerTokenContract = new ethers.Contract(
      rune["lifts"][0].contractAddress,
      MemlayerTokenABI,
      signer,
    );

    const pendingWithdraw = ethers.utils.formatEther(
      await memlayerTokenContract.pendingWithdrawToBTC(ethAddress),
    );
    console.log("pendingWithdraw", pendingWithdraw);

    switch (req.method) {
      case "GET":
        if (pendingWithdraw < 1) {
          return res.status(200).send({
            success: false,
            lastUpdate: Date.now(),
          });
        }

        if (toFinalize) {
          return res.status(200).send({
            success: false,
            lastUpdate: Date.now(),
          });
        } else {
          console.log("operator initating withdraw...");
          await memlayerTokenContract
            .connect(signer)
            .withdrawBalance(
              ethAddress,
              ethers.utils.parseUnits(`${pendingWithdraw}`, "ether"),
              {
                ccipReadEnabled: true,
              },
            );
        }

        return res.status(200).send({
          success: true,
          ethAddress,
          ticker,
          lastUpdate: Date.now(),
        });
    }
  });
});

// memlayer server submit liftTurboRunes request
exports.liftturborunes = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    switch (req.method) {
      case "POST": // handle POST request
        const data = req.body;

        const passcode = data.passcode;
        const ethAddress = data.ethAddress;
        const runeAddress = data.runeAddress;
        const ticker = data.ticker;
        const amount = Number(data.amount);
        const release = data.release === "true" ? true : false;

        if (!amount || !passcode || passcode !== functions.config().passcode.liftturborunes) {
          return res.status(200).send({ success: false, msg: "invalid input" });
        }

        if (!runeAddress?.startsWith("bc1p")) {
          return res.status(200).send({
            success: false,
            msg: "invalid ord address",
          });
        }

        if (!ethers.utils.isAddress(ethAddress)) {
          console.log("invalid ethAddress");
          return res.status(200).send({
            success: false,
            msg: "invalid ethAddress",
          });
        }

        console.log("lift to EVM address", ethAddress);

        const result = await getbalancedb(runeAddress);
        const { claimables, runesData } = await parseBalance(
          runeAddress,
          result,
        );

        let rune;
        for (const index in runesData) {
          if (runesData[index].ticker === ticker) {
            rune = runesData[index];
            break;
          }
        }
        console.log("checking...", rune.ticker);
        console.log("confirmed", rune.confirmed);
        console.log("unconfirmed", rune.unconfirmed);
        const claimable = rune.confirmed;
        console.log("claimable", claimable);
        console.log(rune);

        const provider = new ethers.providers.JsonRpcProvider(
          rune["lifts"][0].chainRPC,
        );

        const signer = new ethers.Wallet(
          functions.config().operator.pkey,
          provider,
        );

        const memlayerTokenContract = new ethers.Contract(
          rune["lifts"][0].contractAddress,
          MemlayerTokenABI,
          signer,
        );

        try {
          let gasSettings = {};
          if (rune["lifts"][0]["chain"] === "rskTestnet") {
          } else if (rune["lifts"][0]["chain"] === "awsaga") {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
              maxPriorityFeePerGas: ethers.utils.parseUnits(
                "0.00000001",
                "gwei",
              ), //0.00000001? for saga?
            };
          } else {
            gasSettings = {
              maxFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
              maxPriorityFeePerGas: ethers.utils.parseUnits("0.0001", "gwei"), //0.00000001? for saga?
            };
          }
          if (rune.unconfirmed + rune.confirmed) {
            if (!release){
              const tx = await memlayerTokenContract
              .connect(signer)
              .liftTurboRunes(ethAddress, amount, gasSettings);
              await tx.wait();
            } else {
              const tx = await memlayerTokenContract
              .connect(signer)
              .releaseTurboRunes(ethAddress, amount, gasSettings);
              await tx.wait();
            }
          }
        } catch (error) {
          console.log(error);
          return res.status(200).send({ success: false, msg: "oops in lifting" });
        }

        return res
          .status(200)
          .send({ success: true, ...rune, turboLiftedAmount: amount, isReleased: release, msg: "liftTurboRunes successfully" });
        break;
    }
  });
});