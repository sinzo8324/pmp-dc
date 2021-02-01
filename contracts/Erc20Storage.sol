/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.6.12;

import 'openzeppelin-solidity/contracts/access/Ownable.sol';

contract Erc20Storage is Ownable {
    uint256 private totalSupply;
    string private name;
    string private symbol;
    uint8 private decimals;
    //keccak256('TYPE_MINTER')
    bytes32 public constant TYPE_MINTER = 0xa8791d3acb7f4f152c41f3308e90b16e68a23666347d9c4c5ce8535dffead10d;
    //keccak256('TYPE_BURNER')
    bytes32 public constant TYPE_BURNER = 0x9a433df5d818859975655002918d19fe2ba4567432e52f0cec8426ddf4dc2ada;

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPE = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    //keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
    bytes32 public constant EIP712_DOMAIN = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;

    mapping (address => uint256) private _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    mapping(address => uint256) public nonces;

    function updateBalance(address _target, uint256 _amount) external onlyOwner {
        _balances[_target] = _amount;
    }

    function updateAllowance(address _owner, address _spender, uint256 _amount) external onlyOwner {
        _allowances[_owner][_spender] = _amount;
    }

    function updateTotalSupply(uint256 _totalSupply) external onlyOwner {
        totalSupply = _totalSupply;
    }

    function increaseNonce(address _account) external onlyOwner {
        nonces[_account] = nonces[_account] + 1;
    }

    function updateTokenDetails(string calldata _name, string calldata _symbol, uint8 _decimals) external onlyOwner {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function getName() external view returns (string memory) {
        return name;
    }

    function getSymbol() external view returns (string memory) {
        return symbol;
    }

    function getDecimals() external view returns (uint8) {
        return decimals;
    }

    function getTotalSupply() external view returns (uint256) {
        return totalSupply;
    }

    function getBalance(address _account) external view returns (uint256) {
        return _balances[_account];
    }

    function getAllowance(address _owner, address _spender) external view returns (uint256) {
        return _allowances[_owner][_spender];
    }

    function getNonce(address _account) external view returns (uint256) {
        return nonces[_account];
    }
}
