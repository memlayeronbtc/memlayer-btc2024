import React, { Component } from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { AddressPurpose, request } from "sats-connect";
import logo from "../images/memlayerlogo512transparent.png";
import btcgamelogo from "../images/bgames_logo.svg";
import MemlayerTokenABI from "../abi/MemlayerTokenABI.json";

const serverUrl = import.meta.env.VITE_FIREBASE_FUNCTION_URL;

class Main extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      localtime: "",
      multiplier: null,
      isClicked: false,
      ethAddress: null,
      canClaim: false,
      isClaiming: [],
      isWithdrawing: [],
      hasProof: false,
      rewardAmount: 0,
      claimed: false,
      signupState: 0,
      ordinalAddress: null,
      noXverse: false,
      accountLinked: false,
      accountChecked: false,
      balance: 0,
      claimableBalance: 0,
      isRefreshing: false,
      isRefreshed: false,
      hasClaimableCredits: 0,
      runes: [],
      erc20Balances: [],
      pendingWithdraws: [],
      finalizedWithdraws: [],
    };
  }

  _isMounted = false;
  provider = null;
  signer = null;
  tree = null;

  componentDidMount() {
    this._isMounted = true;

    if (window.ethereum) {
      // The "any" network will allow spontaneous network changes
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any",
      );

      provider.on("network", (newNetwork, oldNetwork) => {
        // When a Provider makes its initial connection, it emits a "network"
        // event with a null oldNetwork along with the newNetwork. So, if the
        // oldNetwork exists, it represents a changing network
        if (oldNetwork) {
          window.location.reload();
        }
      });

      window.ethereum.on("accountsChanged", function (accounts) {
        window.location.reload();
      });
    }
  }
  componentWillUnmount() {
    this._isMounted = false;
  }
  getEthAddress = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const ethAddress = await signer.getAddress();
    this.setState({
      ethAddress: ethAddress,
    });
  };

  shortenAddress = (address) => {
    return (
      address.substring(0, 8) +
      "..........." +
      address.substring(address.length - 8, address.length)
    );
  };

  refreshErc20Balances = async (address, runes) => {
    const balances = Array.from({ length: runes.length }, () => 0);
    const pendingWithdraws = Array.from({ length: runes.length }, () => 0);
    const finalizedWithdraws = Array.from({ length: runes.length }, () => 0);
    for (let index = 0; index < runes.length; index++) {
      const rune = runes[index];
      const provider = new ethers.providers.JsonRpcProvider(
        rune["lifts"][0].chainRPC,
      );
      const memlayerTokenContract = new ethers.Contract(
        rune["lifts"][0].contractAddress,
        MemlayerTokenABI,
        provider,
      );
      balances[index] = ethers.utils.formatEther(
        await memlayerTokenContract.balanceOf(address),
      );
      pendingWithdraws[index] = ethers.utils.formatEther(
        await memlayerTokenContract.pendingWithdrawToBTC(address),
      );
      finalizedWithdraws[index] = ethers.utils.formatEther(
        await memlayerTokenContract.finalizedWithdrawToBTC(address),
      );
    }
    return { erc20Balances: balances, pendingWithdraws, finalizedWithdraws };
  };

  onConnectAccountClick = async () => {
    // try {
    const response = await request("getAccounts", {
      purposes: [AddressPurpose.Ordinals],
      message: "Memlayer",
    });
    if (response.status === "success") {
      const ordinalsAddressItem = response.result.find(
        (address) => address.purpose === AddressPurpose.Ordinals,
      );
      const ordinalAddress = ordinalsAddressItem?.address;
      // const ordinalPubkey = ordinalsAddressItem?.publicKey;

      if (ordinalAddress) {
        this.setState({
          ordinalAddress,
        });
        const ethAddress = this.state.ethAddress;
        const res = await fetch(
          `${serverUrl}/getoffchainpairing?ethAddress=${ethAddress}&runeAddress=${ordinalAddress}`,
        );
        const resJson = await res.json();

        if (resJson && resJson.success) {
          const { erc20Balances, pendingWithdraws, finalizedWithdraws } =
            await this.refreshErc20Balances(ethAddress, resJson.runes);

          this.setState({
            accountLinked: true,
            runes: resJson.runes,
            erc20Balances,
            pendingWithdraws,
            finalizedWithdraws,
            isClaiming: Array.from(
              { length: resJson.runes.length },
              () => false,
            ),
            isWithdrawing: Array.from(
              { length: resJson.runes.length },
              () => false,
            ),
            hasClaimableCredits: resJson.hasClaimableCredits,
          });
        } else {
          const res = await fetch(`${serverUrl}/pairing`, {
            method: "POST",
            body: JSON.stringify({
              ethAddress: ethAddress,
              runeAddress: ordinalAddress,
              passcode: import.meta.env.VITE_FIREBASE_FUNCTION_PAIRING,
            }),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
          });
          const resJson = await res.json();
          if (resJson && resJson.success) {
            const { erc20Balances, pendingWithdraws, finalizedWithdraws } =
              await this.refreshErc20Balances(ethAddress, resJson.runes);

            this.setState({
              accountLinked: true,
              runes: resJson.runes,
              erc20Balances,
              pendingWithdraws,
              finalizedWithdraws,
              isClaiming: Array.from(
                { length: resJson.runes.length },
                () => false,
              ),
              isWithdrawing: Array.from(
                { length: resJson.runes.length },
                () => false,
              ),
              hasClaimableCredits: resJson.hasClaimableCredits,
            });
          }
        }
      }
    } else {
      if (response.error) {
        alert("Error getting accounts. Check console for error logs");
        console.error(response.error);
      }
    }
    // } catch (error) {
    //   this.setState({
    //     noXverse: true,
    //   });
    //   console.log("plz setup your Xverse wallet");
    // }
  };

  // TODO: switch chain when withdrawing
  addChainToWallet = async (
    chainId,
    chainName,
    rpcUri,
    iconUri,
    ticker,
    symbol,
    decimals,
    explorerUri,
  ) => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        // chainId must be in HEX with 0x in front
        params: [{ chainId: chainId }],
      });
    } catch (error) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId,
                chainName,
                rpcUrls: [rpcUri],
                iconUrls: [iconUri],
                nativeCurrency: {
                  name: ticker,
                  symbol: symbol,
                  decimals: decimals ? decimals : 18,
                },
                blockExplorerUrls: [explorerUri],
              },
            ],
          });
        } catch (addError) {
          // handle "add" error
        }
      }
    }
  };

  render() {
    const {
      isClicked,
      noXverse,
      ethAddress,
      signupState,
      ordinalAddress,
      accountLinked,
      isClaiming,
      isWithdrawing,
      isRefreshing,
      isRefreshed,
      runes,
      accountChecked,
      erc20Balances,
      pendingWithdraws,
      finalizedWithdraws,
    } = this.state;
    const canSignup =
      ordinalAddress && ethAddress && accountChecked && !accountLinked;
    return (
      <div className="flex flex-col min-h-screen overflow-hidden">
        <main className="grow">
          <section className="relative">
            <div
              className="relative max-w-6xl mx-auto px-4 sm:px-6"
              data-aos="fade-up"
              data-aos-delay="200"
            >
              <div className="pt-32 pb-12 md:pt-20 md:pb-20">
                <div className="max-w-3xl mx-auto text-center mb-4">
                  <center data-aos="fade-up" data-aos-delay="200">
                    <img src={logo} width={"128px"} />
                  </center>
                  <br />

                  <h1
                    className="h4 mb-0"
                    data-aos="fade-up"
                    data-aos-delay="400"
                  >
                    memlayer
                  </h1>

                  <a
                    data-aos="fade-up"
                    data-aos-delay="500"
                    href={`https://x.com/memlayer`}
                  >
                    @memlayer
                  </a>
                  <br />
                  <br />
                  <p data-aos="fade-up" data-aos-delay="600">
                    BTC mempool rune TXs lifted to EVM chains
                  </p>
                </div>
                <center>
                  <div className="relative max-w-xl mx-auto px-4 sm:px-6">
                    {!accountLinked ? (
                      !window.ethereum ? (
                        <div>
                          <Link
                            style={{ cursor: "pointer" }}
                            className="btn text-sm text-slate-200 border border-slate-100 shadow-sm mt-3 mb-1 w-80"
                            to={import.meta.env.VITE_FIREBASE_SIGNUP_FORM}
                          >
                            {`Join early access whitelist`}
                          </Link>
                          <a
                            href="https://b.tc/conference/2024/bitcoin-games"
                            target="_blank"
                          >
                            <img
                              style={{ marginTop: "30px", width: "72px" }}
                              src={btcgamelogo}
                            />
                          </a>
                        </div>
                      ) : (
                        <div>
                          {signupState === 0 ? (
                            <div data-aos="fade-up" data-aos-delay="700">
                              <button
                                style={{ cursor: "pointer" }}
                                className="btn text-sm text-slate-200 border border-slate-100 shadow-sm mt-3 mb-1 w-80"
                                onClick={() => {
                                  this.setState({
                                    signupState: 1,
                                  });
                                }}
                              >
                                {`Early Access`}
                              </button>
                              <div data-aos="fade-up" data-aos-delay="1000">
                                <a
                                  href="https://b.tc/conference/2024/bitcoin-games"
                                  target="_blank"
                                >
                                  <img
                                    style={{ marginTop: "30px", width: "72px" }}
                                    src={btcgamelogo}
                                  />
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <button
                                style={{
                                  cursor: !canSignup
                                    ? "pointer"
                                    : "not-allowed",
                                }}
                                disabled={canSignup}
                                className={`btn text-sm text-slate-100 border border-slate-100 shadow-sm mt-3 mb-1 w-80`}
                                onClick={() => {
                                  this.getEthAddress();
                                }}
                              >
                                {ethAddress ? (
                                  <span>
                                    {"ETH: " + this.shortenAddress(ethAddress)}
                                    ✔️
                                  </span>
                                ) : (
                                  `Connect Metamask`
                                )}
                              </button>
                              <button
                                style={{
                                  cursor: ethAddress
                                    ? "pointer"
                                    : "not-allowed",
                                }}
                                disabled={!ethAddress}
                                className={`btn text-sm text-slate-100 border border-slate-100 shadow-sm mt-3 mb-1 w-80`}
                                onClick={() => {
                                  if (noXverse) {
                                    alert("plz install Xverse wallet");
                                  } else {
                                    this.onConnectAccountClick();
                                  }
                                }}
                              >
                                {ordinalAddress ? (
                                  <span>
                                    {"BTC: " +
                                      this.shortenAddress(ordinalAddress)}
                                    ✔️
                                  </span>
                                ) : noXverse ? (
                                  `Xverse wallet not detected❌`
                                ) : (
                                  `Connect Xverse`
                                )}
                              </button>

                              <p
                                style={{
                                  fontSize: "small",
                                  marginTop: "15px",
                                  color: "pink",
                                }}
                              >
                                {!(ethAddress && ordinalAddress)
                                  ? `BTC & ETH addresses are both required for memlayer lifting.`
                                  : `Loading...`}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div>
                        <hr />
                        <br />
                        <span style={{ fontSize: "smaller" }}>
                          BTC ord Address:
                          <br /> {ordinalAddress}✔️
                        </span>
                        <br />
                        <br />
                        <span style={{ fontSize: "smaller" }}>
                          ETH Address:
                          <br />
                          {ethAddress}✔️
                        </span>
                        <br />
                        <br />
                        Rune deposit address:
                        <br />
                        <b style={{ fontSize: "small", color: "pink" }}>
                          {import.meta.env.VITE_RUNE_DEPOSIT_ADDRESS}
                        </b>
                        <br />
                        <span style={{ color: "yellow", fontSize: "small" }}>
                          Only send 'whitelisted' runes FROM your BTC ord
                          address
                        </span>
                        <br />
                        {runes.map((rune, i) => (
                          <p key={`sp${rune.ticker}z`}>
                            <a
                              href={`https://ordinals.com/rune/${rune.number}`}
                              style={{ textDecoration: "underline" }}
                            >
                              <b style={{ fontSize: "small" }}>{rune.ticker}</b>
                            </a>
                          </p>
                        ))}
                        <br />
                        <hr />
                        <p style={{ fontSize: "smaller" }}>
                          {runes.map((rune, i) => (
                            <span key={`sp${rune.ticker}`}>
                              <br />
                              <b style={{ fontSize: "larger" }}>
                                {rune.ticker}
                              </b>
                              <br />
                              {/* Rune deposit address:
                              <br />
                              <b style={{ fontSize: "small", color: "pink" }}>
                                {rune.lifts[0].depositAddress}
                              </b>
                              <br />
                              <span style={{ color: "red", fontSize: "small" }}>
                                Only send{" "}
                                <a
                                  href={`https://ordinals.com/rune/${rune.number}`}
                                  style={{ textDecoration: "underline" }}
                                >
                                  {rune.ticker}
                                </a>{" "}
                                FROM your BTC ord address
                              </span>
                              <br /> */}
                              <br />
                              <a
                                href={`https://ordinals.com/rune/${rune.number}`}
                                style={{ textDecoration: "underline" }}
                              >
                                BTC{" "}
                              </a>
                              {` 🡢 `}
                              <a
                                href={`${rune.lifts[0].explorer}/address/${rune.lifts[0].contractAddress}`}
                                style={{ textDecoration: "underline" }}
                              >
                                {rune.lifts[0].chain}
                              </a>
                              <br />
                              {rune.confirmed > 0 && (
                                <span>
                                  Confirmed Deposit (L1): {rune.confirmed}{" "}
                                  {rune.symbol}
                                  <br />
                                </span>
                              )}
                              {rune.unconfirmed > 0 && (
                                <span>
                                  Unconfirmed Deposit (L1): {rune.unconfirmed}{" "}
                                  {rune.symbol}
                                  <br />
                                </span>
                              )}
                              {rune.confirmed +
                                rune.unconfirmed -
                                erc20Balances[i] >
                                0 && (
                                <span>
                                  Runic balance (Memlayer):{" "}
                                  {rune.confirmed +
                                    rune.unconfirmed -
                                    erc20Balances[i]}{" "}
                                  {rune.symbol}
                                  <br />
                                </span>
                              )}
                              {Math.floor(erc20Balances[i]) > 0 && (
                                <span>
                                  <b>Wallet Balance</b> (ERC20):{" "}
                                  <b>
                                    {Math.floor(erc20Balances[i])} {rune.symbol}
                                  </b>
                                  <br />
                                </span>
                              )}
                              {Math.floor(pendingWithdraws[i]) > 0 && (
                                <span>
                                  Pending withdraw (ERC20):{" "}
                                  {Math.floor(pendingWithdraws[i])}{" "}
                                  {rune.symbol}
                                  <br />
                                </span>
                              )}
                              {Math.floor(finalizedWithdraws[i]) > 0 && (
                                <span>
                                  Outgoing withdraw (Memlayer):{" "}
                                  {Math.floor(finalizedWithdraws[i])}{" "}
                                  {rune.symbol}
                                  <br />
                                </span>
                              )}
                              {/* <span>Confirmed withdraw (L1): {rune.unconfirmed}{" "}
                              {rune.symbol}
                              <br /></span> */}
                              {rune.confirmed > 0 && (
                                <button
                                  disabled={isClaiming[i]}
                                  className={`btn text-sm text-yellow-400 border border-yellow-400 shadow-sm mt-3 mb-1 w-80`}
                                  onClick={async () => {
                                    const runes = this.state.runes;
                                    const nowClaiming = Array.from(
                                      { length: runes.length },
                                      () => false,
                                    );
                                    nowClaiming[i] = true;
                                    this.setState({
                                      isClaiming: nowClaiming,
                                    });

                                    // server will claim all
                                    const res = await fetch(
                                      `${serverUrl}/claim`,
                                      {
                                        method: "POST",
                                        body: JSON.stringify({
                                          ethAddress: ethAddress,
                                          runeAddress: ordinalAddress,
                                          passcode: import.meta.env
                                            .VITE_FIREBASE_FUNCTION_CLAIM,
                                          ticker: rune.ticker,
                                        }),
                                        headers: {
                                          "Content-type":
                                            "application/json; charset=UTF-8",
                                        },
                                      },
                                    );
                                    const resJson = await res.json();
                                    if (resJson.success) {
                                      const runes = this.state.runes;
                                      const {
                                        erc20Balances,
                                        pendingWithdraws,
                                        finalizedWithdraws,
                                      } = await this.refreshErc20Balances(
                                        ethAddress,
                                        runes,
                                      );

                                      const nowClaiming = Array.from(
                                        { length: runes.length },
                                        () => false,
                                      );
                                      this.setState({
                                        erc20Balances,
                                        pendingWithdraws,
                                        finalizedWithdraws,
                                        isClaiming: nowClaiming,
                                      });
                                    }
                                  }}
                                >
                                  {isClaiming[i] ? `Claiming...` : `Claim`}
                                </button>
                              )}
                              <br />
                              {Math.floor(erc20Balances[i]) > 0 && (
                                <button
                                  disabled={isWithdrawing[i]}
                                  className={`btn text-sm text-pink-400 border border-pink-400 shadow-sm mt-3 mb-1 w-80`}
                                  onClick={async () => {
                                    const runes = this.state.runes;
                                    const nowWithdrawing = Array.from(
                                      { length: runes.length },
                                      () => false,
                                    );
                                    nowWithdrawing[i] = true;
                                    this.setState({
                                      isWithdrawing: nowWithdrawing,
                                    });

                                    const provider =
                                      new ethers.providers.Web3Provider(
                                        window.ethereum,
                                        "any",
                                      );
                                    await provider.send(
                                      "eth_requestAccounts",
                                      [],
                                    );
                                    const signer = provider.getSigner();
                                    const memlayerTokenContract =
                                      new ethers.Contract(
                                        rune["lifts"][0].contractAddress,
                                        MemlayerTokenABI,
                                        signer,
                                      );
                                    const tx =
                                      await memlayerTokenContract.withdrawToBTC(
                                        ethers.utils.parseUnits("100", "ether"),
                                      );
                                    await tx.wait();

                                    const {
                                      erc20Balances,
                                      pendingWithdraws,
                                      finalizedWithdraws,
                                    } = await this.refreshErc20Balances(
                                      signer.getAddress(),
                                      runes,
                                    );
                                    nowWithdrawing[i] = false;
                                    this.setState({
                                      isWithdrawing: nowWithdrawing,
                                      erc20Balances,
                                      pendingWithdraws,
                                      finalizedWithdraws,
                                    });
                                  }}
                                >
                                  {isWithdrawing[i]
                                    ? `Initiating withdraw...`
                                    : `Withdraw`}
                                </button>
                              )}
                              <br />
                              <br />
                              <br />
                            </span>
                          ))}

                          <button
                            // style={{ cursor: canClaim ? "pointer" : "not-allowed" }}
                            disabled={isRefreshing}
                            className={`btn text-sm text-slate-100 border border-slate-100 shadow-sm mt-5 mb-1 w-80`}
                            onClick={async () => {
                              this.setState({
                                isRefreshing: true,
                              });

                              const res = await fetch(
                                `${serverUrl}/getoffchainpairing?ethAddress=${this.state.ethAddress}&runeAddress=${ordinalAddress}`,
                              );
                              const resJson = await res.json();
                              console.log(resJson);
                              if (resJson && resJson.success) {
                                const runes = resJson.runes;
                                const {
                                  erc20Balances,
                                  pendingWithdraws,
                                  finalizedWithdraws,
                                } = await this.refreshErc20Balances(
                                  ethAddress,
                                  runes,
                                );
                                this.setState({
                                  accountLinked: true,
                                  runes,
                                  isRefreshed: true,
                                  erc20Balances,
                                  pendingWithdraws,
                                  finalizedWithdraws,
                                });

                                setTimeout(() => {
                                  this.setState({
                                    isRefreshed: false,
                                    isRefreshing: false,
                                  });
                                }, 3000);
                              }
                            }}
                          >
                            {isRefreshing
                              ? isRefreshed
                                ? `Refreshed`
                                : `Refreshing...`
                              : `Refresh`}
                          </button>
                        </p>
                      </div>
                    )}
                  </div>
                </center>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }
}

export default Main;
