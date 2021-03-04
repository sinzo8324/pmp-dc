/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity 0.7.6;

 /**
 * @title Contract that will work with ERC223 tokens.
 */
 
interface IERC223Recipient { 
/**
 * @dev Standard ERC223 function that will handle incoming token transfers.
 *
 * @param from  Token sender address.
 * @param value Amount of tokens.
 * @param data  Transaction metadata.
 */
    function tokenFallback(address from, uint256 value, bytes calldata data) external;
}
