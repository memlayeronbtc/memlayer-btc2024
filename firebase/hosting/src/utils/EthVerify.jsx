import React, { Component } from "react";
import PropTypes from "prop-types";
import { ethers } from "ethers";

class EthVerify extends Component {
  static propTypes = {
    signinCallback: PropTypes.func,
  };

  _isMounted = false;
  provider = null;
  signer = null;

  constructor(props) {
    super(props);
    this.state = {
      user: null,
      ethAddress: null,
      signing: false,
      verifying: false,
      ENS: null,
    };
  }

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  getSigner = async () => {
    if (!this._isMounted) return false;
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      this.signer = this.provider.getSigner();
      const address = await this.signer.getAddress();
      this.setState({
        ethAddress: address.toLowerCase(),
        signing: true,
        ENS: null,
      });
      return address.toLowerCase();
    } catch (err) {
      this.setState({
        user: null,
        ethAddress: null,
        signing: false,
        verifying: false,
        ENS: null,
      });
      alert("You need to log into your ETH wallet.");

      //throw new Error(
      //  'You need to log into your MetaMask wallet.'
      //);
    }
    return false;
  };

  handlePostLoggedIn = () => {
    // update the user's NFTs after logging in
    try {
      //console.log("post signed-in. get nft assets");
    } catch (error) {
      console.log(error);
    }
  };

  handleLoggedIn = (auth) => {
    const userData = { token: auth.accessToken, ethAddress: auth.ethAddr };
    this.props.signinCallback(auth);
    if (this._isMounted && userData.token) {
      this.setState({ user: userData });
    }
  };

  handleAuthenticate = async (result) => {
    //console.log('verifying signature');
    const ethAddr = result.address;
    const signature = result.signature;
    this.setState({
      verifying: true,
    });
    const response = await fetch(
      `${import.meta.env.VITE_FIREBASE_FUNCTION_URL}/auth`,
      {
        body: JSON.stringify({ ethAddr, signature }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    return response.json();
  };

  handleSignMessage = async (user) => {
    //console.log("prepare to sign", user);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      this.signer = this.provider.getSigner();
      const address = await this.signer.getAddress();
      const signature = await this.signer.signMessage(
        `Signing with one-time nonce: ${user.nonce}`,
      );
      this.setState({
        ethAddress: address.toLowerCase(),
      });
      return { signature: signature, address: address };
    } catch (err) {
      this.setState({
        user: null,
        ethAddress: null,
        signing: false,
        verifying: false,
        ENS: null,
      });
      throw new Error(
        "You need to sign the message to connect your ETH wallet.",
      );
    }
  };

  handleSignup = async (user) => {
    const ethAddr = user.address;
    const response = await fetch(
      `${import.meta.env.VITE_FIREBASE_FUNCTION_URL}/user`,
      {
        body: JSON.stringify({ ethAddr: ethAddr }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
    return response.json();
  };

  handleClick = async () => {
    if (!this._isMounted) return false;
    // sign out if the user is signed in
    const { user, signing, verifying } = this.state;

    if (user) {
      window.location.reload();
      return;
    }

    if (signing || verifying) return;

    this.setState({
      signing: true,
    });

    const ethAddress = await this.getSigner();

    if (ethAddress) {
      // Look if user with current ethAddress is already present on backend
      fetch(
        `${import.meta.env.VITE_FIREBASE_FUNCTION_URL}/user?ethAddr=${ethAddress}`,
      )
        .then((response) => response.json())
        // If yes, retrieve it. If no, create it.
        .then((user) => (user.success ? user : this.handleSignup(user)))
        // Popup MetaMask confirmation modal to sign message
        .then(this.handleSignMessage)
        // Send signature to backend on the /auth route
        .then(this.handleAuthenticate)
        // Save accessToken to store
        .then(this.handleLoggedIn)
        // Fetch other user data post logged-in
        .then(this.handlePostLoggedIn)
        .catch((err) => {
          //TODO: handle error msg
          window.alert(err);
          if (this._isMounted) {
            this.setState({ signing: false });
          }
        });
    }
  };

  render() {
    const { user, signing, verifying } = this.state;
    return (
      <button
        id="metamask-signin"
        className="btn text-sm text-white border border-slate-200 hover:bg-indigo-900 w-full shadow-sm group"
        onClick={() => {
          this.handleClick();
        }}
      >
        {user && user.token
          ? "Disconnect Wallet"
          : signing
            ? verifying
              ? "Verifying..."
              : "Please Sign to Verify"
            : "Connect Wallet"}
      </button>
    );
  }
}

export default EthVerify;
