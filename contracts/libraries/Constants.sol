// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

library Constants {
    bytes32 constant DEFAULT_ADMIN_ROLE = 0x00;

    bytes32 constant TYPE_OPERATOR = 0x9fcbc028a398b1c2b359b09bbe9cc6a31f9bdb6608fee74a6b53dedeeed8bb8f;
    //keccak256('TYPE_MINTER')
    bytes32 constant TYPE_MINTER = 0xa8791d3acb7f4f152c41f3308e90b16e68a23666347d9c4c5ce8535dffead10d;
    //keccak256('TYPE_BURNER')
    bytes32 constant TYPE_BURNER = 0x9a433df5d818859975655002918d19fe2ba4567432e52f0cec8426ddf4dc2ada;
    // keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)');
    bytes32 constant PERMIT_TYPE = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;
    //keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
    bytes32 constant EIP712_DOMAIN = 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f;
    uint256 constant CHAINID = 8888;

    bytes32 constant ACCESSCONTROL_STORAGE_POSITION = keccak256('diamond.standard.accesscontrol.facet.storage');
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256('diamond.standard.diamond.storage');
    bytes32 constant ERC20_STORAGE_POSITION = keccak256('diamond.standard.erc20.facet.storage');
    bytes32 constant PAUSABLE_STORAGE_POSITION = keccak256('diamond.standard.pausable.facet.storage');
}
