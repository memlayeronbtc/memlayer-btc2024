//SPDX-License-Identifier: MIT license

// Memlayer ERC20 token w. CCIP-read BTC rune balance

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

interface Gateway {
    // get runic claimable balance
    function getSignedRunicBalance(
        address ethAddr,
        string memory ticker
    ) external view returns (uint256 balance, bytes memory sig);

    // claim runic balance to EVM handled by the gateway
    function claimSignedRunicBalance(
        address ethAddr,
        string memory ticker
    ) external view returns (uint256 balance, bytes memory sig);

    // withdraw balance back to BTC deposit address
    // gateway will validate all balances
    function withdrawSignedRunicBalance(
        address ethAddr,
        string memory ticker,
        uint256 amount
    ) external view returns (uint256 balance, bytes memory sig);

    // offchain btc/eth pair lookup
    function getPairedEthAddress(
        string memory btcAddr
    ) external view returns (address ethAddr, bytes memory sig);

    // offchain btc/eth pair lookup
    function getPairedOrdAddress(
        address ethAddr
    ) external view returns (string memory btcAddr, bytes memory sig);
}

error OffchainLookup(
    address sender,
    string[] urls,
    bytes callData,
    bytes4 callbackFunction,
    bytes extraData
);

contract MemlayerToken is ERC20, ERC20Burnable, Ownable {
    event SetTokenOperator(address, bool);
    event Consume(address, uint256);
    event Airdrop(address, uint256);

    using ECDSA for bytes32;

    string[] public gatewayUrls;
    address private _signer;
    uint256 public maxSupply;
    string public runeDepositAddress;

    mapping(address => bool) public tokenOperator;
    mapping(address => uint256) public unconfirmedRunicBalance; // cannot be transferred
    mapping(address => uint256) public claimedBalance;
    mapping(address => uint256) public pendingWithdrawToBTC;
    mapping(address => uint256) public finalizedWithdrawToBTC;

    constructor(
        string memory name, // rune name/ticker
        string memory symbol, // ticker's first 3 letters
        uint256 _maxSupply // max bridged supply 10,000,000
    ) ERC20(name, symbol) {
        maxSupply = _maxSupply;
        tokenOperator[msg.sender] = true; // deployer can operate
        _signer = msg.sender;
    }

    function setTokenOperator(
        address newOperator,
        bool canOperate
    ) public onlyOwner {
        require(newOperator != address(0));
        tokenOperator[newOperator] = canOperate;
        emit SetTokenOperator(newOperator, canOperate);
    }

    function getClaimedBalance(address addr) public view returns (uint256) {
        require(addr != address(0), "invalid address");
        return claimedBalance[addr];
    }

    function getUnconfirmedRunicBalance(
        address addr
    ) public view returns (uint256) {
        require(addr != address(0), "invalid address");
        return unconfirmedRunicBalance[addr];
    }

    function getPendingWithdrawToBTC(
        address addr
    ) public view returns (uint256) {
        require(addr != address(0), "invalid address");
        return pendingWithdrawToBTC[addr];
    }

    function getFinalizedWithdrawToBTC(
        address addr
    ) public view returns (uint256) {
        require(addr != address(0), "invalid address");
        return finalizedWithdrawToBTC[addr];
    }

    function setGatewayUrl(string[] memory newGatewayUrls) external onlyOwner {
        gatewayUrls = newGatewayUrls;
    }

    function setRuneDepositAddress(
        string memory newRuneDepositAddress
    ) external onlyOwner {
        runeDepositAddress = newRuneDepositAddress;
    }

    function setSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "invalid address");
        _signer = signer_;
    }

    function getSigner() public view returns (address) {
        return _signer;
    }

    // lift confirmed runic balances to erc20
    function liftRunes(address addr, uint256 balance) external {
        require(tokenOperator[msg.sender], "invalid operator");
        require(addr != address(0), "invalid address");
        require(
            totalSupply() + balance * 1 ether <= maxSupply,
            "cannot lift beyond maxSupply"
        );
        _mint(addr, balance * 1 ether);
        claimedBalance[addr] += balance * 1 ether;
    }

    // lift unonfirmed runic balances to erc20 but marked untransferrable
    function liftTurboRunes(address addr, uint256 balance) external {
        require(tokenOperator[msg.sender], "invalid operator");
        require(addr != address(0), "invalid address");
        require(
            totalSupply() + balance * 1 ether <= maxSupply,
            "cannot lift beyond maxSupply"
        );
        _mint(addr, balance * 1 ether);
        unconfirmedRunicBalance[addr] += balance * 1 ether;
        claimedBalance[addr] += balance * 1 ether;
    }

    // lift unonfirmed runic balances to erc20 but marked untransferrable
    function releaseTurboRunes(address addr, uint256 balance) external {
        require(tokenOperator[msg.sender], "invalid operator");
        require(addr != address(0), "invalid address");
        require(
            unconfirmedRunicBalance[addr] >= balance * 1 ether,
            "cannot release more"
        );
        unconfirmedRunicBalance[addr] -= balance * 1 ether;
    }

    // check runic balance with ethAddress
    // send paired btc address and ticker to gateway
    // gateway return runic balance
    function runicBalance(address addr) public view returns (uint balance) {
        if (addr == address(0)) {
            return 0;
        } else {
            revert OffchainLookup(
                address(this),
                gatewayUrls,
                abi.encodeWithSelector(
                    Gateway.getSignedRunicBalance.selector,
                    addr,
                    name()
                ),
                MemlayerToken.runicBalanceOfWithSig.selector,
                abi.encode(addr, name())
            );
        }
    }

    // callback func to validate gateway signature
    function runicBalanceOfWithSig(
        bytes calldata result
    ) external view returns (uint) {
        (uint256 balance, bytes memory sig) = abi.decode(
            result,
            (uint256, bytes)
        );

        address recovered = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(balance))
            )
        ).recover(sig);

        require(_signer == recovered, "Signer is not the signer of the token");
        return balance;
    }

    function claimBalance() public view returns (uint balance) {
        address addr = msg.sender;
        if (addr == address(0)) {
            return 0;
        } else {
            revert OffchainLookup(
                address(this),
                gatewayUrls,
                abi.encodeWithSelector(
                    Gateway.claimSignedRunicBalance.selector,
                    addr,
                    name()
                ),
                MemlayerToken.claimBalanceOfWithSig.selector,
                abi.encode(addr, name())
            );
        }
    }

    // callback func to validate gateway signature
    function claimBalanceOfWithSig(
        bytes calldata result
    ) external view returns (uint) {
        (uint256 balance, bytes memory sig) = abi.decode(
            result,
            (uint256, bytes)
        );

        address recovered = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(balance))
            )
        ).recover(sig);

        require(_signer == recovered, "Signer is not the signer of the token");
        return balance;
    }

    function getOrdAddress(address addr) public view returns (string memory) {
        if (addr == address(0)) {
            return "";
        } else {
            revert OffchainLookup(
                address(this),
                gatewayUrls,
                abi.encodeWithSelector(
                    Gateway.getPairedOrdAddress.selector,
                    addr
                ),
                MemlayerToken.getOrdAddrWithSig.selector,
                abi.encode(addr)
            );
        }
    }

    // callback func to validate gateway signature
    function getOrdAddrWithSig(
        bytes calldata result
    ) external view returns (string memory) {
        (string memory btcAddr, bytes memory sig) = abi.decode(
            result,
            (string, bytes)
        );

        address recovered = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(btcAddr))
            )
        ).recover(sig);

        require(_signer == recovered, "Signer is not the signer of the token");
        return btcAddr;
    }

    function getEthAddress(string memory addr) public view returns (address) {
        bytes memory memaddr = bytes(addr);
        if (memaddr.length == 0) {
            return address(0);
        } else {
            revert OffchainLookup(
                address(this),
                gatewayUrls,
                abi.encodeWithSelector(
                    Gateway.getPairedEthAddress.selector,
                    addr
                ),
                MemlayerToken.getEthAddrWithSig.selector,
                abi.encode(addr)
            );
        }
    }

    // callback func to validate gateway signature
    function getEthAddrWithSig(
        bytes calldata result
    ) external view returns (address) {
        (address ethAddr, bytes memory sig) = abi.decode(
            result,
            (address, bytes)
        );

        address recovered = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(ethAddr))
            )
        ).recover(sig);

        require(_signer == recovered, "Signer is not the signer of the token");
        return ethAddr;
    }

    // submit withdraw request by user
    function withdrawToBTC(uint256 amount) public {
        require(amount > 0, "no balance to withdraw");
        transfer(address(this), amount);
        pendingWithdrawToBTC[msg.sender] += amount;
    }

    // operator
    function withdrawBalance(
        address addr,
        uint256 amount
    ) public view returns (uint balance) {
        require(tokenOperator[msg.sender], "invalid operator");
        if (addr == address(0)) {
            return 0;
        } else {
            revert OffchainLookup(
                address(this),
                gatewayUrls,
                abi.encodeWithSelector(
                    Gateway.withdrawSignedRunicBalance.selector,
                    addr,
                    name(),
                    amount
                ),
                MemlayerToken.withdrawBalanceOfWithSig.selector,
                abi.encode(addr, name(), amount)
            );
        }
    }

    // callback func to validate gateway signature
    function withdrawBalanceOfWithSig(
        bytes calldata result
    ) external view returns (uint) {
        (uint256 balance, bytes memory sig) = abi.decode(
            result,
            (uint256, bytes)
        );

        address recovered = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(abi.encodePacked(balance))
            )
        ).recover(sig);

        require(_signer == recovered, "Signer is not the signer of the token");
        return balance;
    }

    // finalize withdraw state by operator
    function finalizeWithdrawToBTC(address to) public {
        require(tokenOperator[msg.sender], "invalid operator");
        require(pendingWithdrawToBTC[to] > 0, "no pending balance to withdraw");
        _burn(address(this), pendingWithdrawToBTC[to]);
        pendingWithdrawToBTC[to] = 0;
        finalizedWithdrawToBTC[to] += pendingWithdrawToBTC[to];
    }

    /* game mechanics */
    function _spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) internal virtual override {
        if (!tokenOperator[spender]) {
            uint256 currentAllowance = allowance(owner, spender);
            if (currentAllowance != type(uint256).max) {
                require(
                    currentAllowance >= amount,
                    "ERC20: insufficient allowance"
                );
                unchecked {
                    _approve(owner, spender, amount);
                }
            }
        }
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        require(
            (balanceOf(sender) - amount) >= unconfirmedRunicBalance[sender],
            "cannot transfer unconfirmed runic balance"
        );

        super._transfer(sender, recipient, amount);
    }
}
