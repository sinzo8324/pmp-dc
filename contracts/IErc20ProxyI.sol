/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.5.6;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IErc20ProxyI {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    function setTokenDetails(string calldata _name, string calldata _symbol, uint8 _decimals) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
    function issue(address _tokenHolder, uint256 _value) external;
    function redeem(address _tokenHolder, uint256 _value) external;

    function addDataStorage(address _storageContract) external;
    function updateDataStorage(uint256 _index, address _storageContract) external;
    function updateLogicContract(address _logicContract) external;
    function transferStorageOwnership(uint256 _index, address _target) external;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}
