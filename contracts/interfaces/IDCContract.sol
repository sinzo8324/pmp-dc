/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;
pragma experimental ABIEncoderV2;

import './IDiamondCut.sol';
import './IDiamondLoupe.sol';

interface IDCContract is IDiamondCut, IDiamondLoupe {
    //Access control
    function hasRole(bytes32 role, address account) external view returns (bool);
    function getRoleMemberCount(bytes32 role) external view returns (uint256);
    function getRoleMember(bytes32 role, uint256 index) external view returns (address);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function addRoleType(bytes32 role) external;
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;

    //Erc20
    function setVersion(string calldata _version) external;
    function updateTokenDetails(string calldata _name, string calldata  _symbol, uint8 _decimals) external;
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
    function issue(address tokenHolder, uint256 value) external;
    function redeem(address tokenHolder, uint256 value) external;
    function nonces(address owner) external view returns (uint256);
    function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external;

    //Pausable
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}
