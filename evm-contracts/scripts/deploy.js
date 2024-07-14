// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const fs = require("fs");
const envfile = require("envfile");
const filename = "../.env";
const parsedFile = envfile.parse(fs.readFileSync(filename));

// npx hardhat run scripts\deploy.js --network rskTestnet // non-turbo
// npx hardhat run scripts\deploy.js --network alysTestnet // turbo
// npx hardhat run scripts\deploy.js --network awsaga // test

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log(``)
  console.log("The signer is set to:", deployer.address);
  const TestTokenContract =
    await hre.ethers.getContractFactory("MemlayerToken");
  const name = "MEMLAYER•TOKEN";
  const symbol = name.substring(0,3);
  // const url = "http://127.0.0.1:8188"; // for local test
  const url = parsedFile.SERVER_URI;
  const maxSupply = ethers.utils.parseEther("1000000"); // cap the maximum lifted runes for safety
  const TestToken = await TestTokenContract.deploy(name, symbol, maxSupply);
  await TestToken.deployed();
  await TestToken.connect(deployer).setGatewayUrl([url]);
  await TestToken.connect(deployer).setTokenOperator(parsedFile.ETH_OPERATOR_ADDRESS, true);
  await TestToken.connect(deployer).setRuneDepositAddress(parsedFile.RUNE_DEPOSIT_ADDRESS);

  console.log(`remember to setup chain RPC info in firebase database for firebase functions and CCIP-read gateway server to work`)
  console.log(``)
  console.log(`ETH_OPERATOR_ADDRESS: ${parsedFile.ETH_OPERATOR_ADDRESS}`);
  console.log(`RUNE_DEPOSIT_ADDRESS: ${parsedFile.RUNE_DEPOSIT_ADDRESS}`);

  console.log(`----`)
  console.log(`${name} deployed to: ${TestToken.address}`);
  console.log(`----`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
