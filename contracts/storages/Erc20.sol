// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import '../libraries/Constants.sol';

library Erc20 {
    struct Erc20Storage {
        uint256 totalSupply;
        string name;
        string symbol;
        uint8 decimals;
        mapping(address => uint256) balances;
        mapping(address => mapping (address => uint256)) allowances;
        mapping(address => uint256) nonces;
        string version;
    }

    function erc20Storage() internal pure returns (Erc20Storage storage fs) {
        bytes32 position = Constants.ERC20_STORAGE_POSITION;
        assembly {
            fs.slot := position
        }
    }

}
