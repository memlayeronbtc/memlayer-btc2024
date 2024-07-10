const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const fs = require("fs");
const envfile = require("envfile");
const filename = "../.env";
const parsedFile = envfile.parse(fs.readFileSync(filename));

async function getLastTxGas() {
  // Get latest transaction hash
  const latestBlock = await ethers.provider.getBlock("latest");
  const latestTXHash = latestBlock.transactions.at(-1);
  // Get latest transaction receipt object
  const latestTXReceipt =
    await ethers.provider.getTransactionReceipt(latestTXHash);
  // Determine latest transaction gas costs
  const latestTXGasUsage = latestTXReceipt.gasUsed;
  const latestTXGasPrice = latestTXReceipt.effectiveGasPrice;
  const latestTXGasCosts = latestTXGasUsage.mul(latestTXGasPrice);
  return Number(latestTXGasUsage);
}

describe("Token contract", function () {
  async function deployTokenFixture() {
    const MemlayerTokenContract =
      await ethers.getContractFactory("MemlayerToken");
    const [deployer, operator, user1, user2] = await ethers.getSigners();

    const name = "MEMLAYER•TOKEN";
    const symbol = "MEM";
    const url = parsedFile.SERVER_URI;
    const maxSupply = ethers.utils.parseEther("100000000"); // cap the maximum lifted runes for safety

    const MemlayerToken = await MemlayerTokenContract.deploy(
      name,
      symbol,
      maxSupply,
    );

    console.log("\tGas(MemlayerToken-deployment):\t", await getLastTxGas());

    await MemlayerToken.connect(deployer).setGatewayUrl([url]);
    await MemlayerToken.connect(deployer).setTokenOperator(
      operator.address,
      true,
    );
    await MemlayerToken.connect(deployer).setRuneDepositAddress(
      parsedFile.RUNE_DEPOSIT_ADDRESS,
    );

    await MemlayerToken.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { MemlayerToken, deployer, operator, user1, user2 };
  }

  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { MemlayerToken, deployer } = await loadFixture(deployTokenFixture);
      expect(await MemlayerToken.owner()).to.equal(deployer.address);
    });

    it("Should have correct initial supply", async function () {
      const { MemlayerToken, deployer } = await loadFixture(deployTokenFixture);
      const ownerBalance = await MemlayerToken.balanceOf(deployer.address);
      expect(await MemlayerToken.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Lifting Runes", function () {
    it("Should operator lift runes to users", async function () {
      const { MemlayerToken, operator, user1, user2 } =
        await loadFixture(deployTokenFixture);

      await MemlayerToken.connect(operator).liftRunes(user1.address, 100);
      console.log("\tGas(MemlayerToken-liftRunes):\t", await getLastTxGas());

      expect(await MemlayerToken.balanceOf(user1.address)).to.equal(
        ethers.utils.parseUnits("100", "ether"),
      );
    });

    it("Should operator lift unconfirmed turbo runes to users", async function () {
      const { MemlayerToken, operator, user1, user2 } =
        await loadFixture(deployTokenFixture);

      await MemlayerToken.connect(operator).liftTurboRunes(user1.address, 100);

      expect(await MemlayerToken.balanceOf(user1.address)).to.equal(
        ethers.utils.parseUnits("100", "ether"),
      );

      expect(
        await MemlayerToken.getUnconfirmedRunicBalance(user1.address),
      ).to.equal(ethers.utils.parseUnits("100", "ether"));
    });

    it("Should revert for transferring unconfirmed turbo runes", async function () {
      const { MemlayerToken, operator, user1, user2 } =
        await loadFixture(deployTokenFixture);

      await MemlayerToken.connect(operator).liftTurboRunes(user1.address, 100);

      await expect(
        MemlayerToken.connect(user1).transfer(
          user2.address,
          ethers.utils.parseUnits("1", "ether"),
        ),
      ).to.be.revertedWith("cannot transfer unconfirmed runic balance");
    });

    it("Should transfer unconfirmed turbo runes after operator releases", async function () {
      const { MemlayerToken, operator, user1, user2 } =
        await loadFixture(deployTokenFixture);

      await MemlayerToken.connect(operator).liftTurboRunes(user1.address, 100);
      console.log(
        "\tGas(MemlayerToken-liftTurboRunes):\t",
        await getLastTxGas(),
      );

      await expect(
        MemlayerToken.connect(user1).transfer(
          user2.address,
          ethers.utils.parseUnits("1", "ether"),
        ),
      ).to.be.revertedWith("cannot transfer unconfirmed runic balance");

      await MemlayerToken.connect(operator).releaseTurboRunes(
        user1.address,
        10,
      );

      expect(
        await MemlayerToken.getUnconfirmedRunicBalance(user1.address),
      ).to.equal(ethers.utils.parseUnits("90", "ether"));

      await expect(
        MemlayerToken.connect(user1).transfer(
          user2.address,
          ethers.utils.parseUnits("11", "ether"),
        ),
      ).to.be.revertedWith("cannot transfer unconfirmed runic balance");

      await MemlayerToken.connect(user1).transfer(
        user2.address,
        ethers.utils.parseUnits("1", "ether"),
      );
      console.log("\tGas(MemlayerToken-transfer):\t", await getLastTxGas());

      expect(await MemlayerToken.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("1", "ether"),
      );

      await MemlayerToken.connect(operator).releaseTurboRunes(
        user1.address,
        90,
      );

      expect(
        await MemlayerToken.getUnconfirmedRunicBalance(user1.address),
      ).to.equal(ethers.utils.parseUnits("0", "ether"));

      await MemlayerToken.connect(user1).transfer(
        user2.address,
        ethers.utils.parseUnits("99", "ether"),
      );
      console.log("\tGas(MemlayerToken-transfer):\t", await getLastTxGas());

      expect(await MemlayerToken.balanceOf(user2.address)).to.equal(
        ethers.utils.parseUnits("100", "ether"),
      );
    });
  });
});
