/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;

import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';

interface IDCContract is IERC20 {
    function issue(address _tokenHolder, uint256 _value) external;
    function redeem(address _tokenHolder, uint256 _value) external;
    function pause() external;
    function unpause() external;
    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;
    function nonces(address owner) external view returns (uint);
}
