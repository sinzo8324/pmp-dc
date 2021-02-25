/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;

import 'openzeppelin-solidity/contracts/access/AccessControl.sol';
import 'openzeppelin-solidity/contracts/utils/Pausable.sol';
import './EternalStorage.sol';

contract Proxy is AccessControl, Pausable, EternalStorage {
    bytes32 public constant TYPE_OPERATOR = 0x9fcbc028a398b1c2b359b09bbe9cc6a31f9bdb6608fee74a6b53dedeeed8bb8f;

    modifier onlyOperator() {
        require(hasRole(TYPE_OPERATOR, _msgSender()), 'Caller is not the Operator');
        _;
    }

    constructor () {
        _setRoleAdmin(TYPE_OPERATOR, TYPE_OPERATOR);
        _setupRole(TYPE_OPERATOR, _msgSender());
    }

    fallback() external {
        address _impl = _implementation();
        require(_impl != address(0), 'Logic contract has not been registed yet');

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    function updateLogicContract(address logicContract, string calldata version) external onlyOperator {
        bytes32 key = keccak256(abi.encodePacked('implementation'));
        set(key, logicContract);
        key = keccak256(abi.encodePacked('version'));
        set(key, version);
    }

    function getVersion() external view returns (string memory) {
        bytes32 key = keccak256(abi.encodePacked('version'));
        return getStringValue(key);
    }

    function getLogicContractAddress() external view returns (address) {
        return _implementation();
    }

    function updateTokenDetails(string calldata inputName, string calldata inputSymbol, uint8 inputDecimals) external onlyOperator {
        bytes32 key = keccak256(abi.encodePacked('name'));
        set(key, inputName);
        key = keccak256(abi.encodePacked('symbol'));
        set(key, inputSymbol);
        key = keccak256(abi.encodePacked('decimals'));
        set(key, inputDecimals);
    }

    function addRoleType(bytes32 role) external onlyOperator {
        _setRoleAdmin(role, TYPE_OPERATOR);
    }

    function pause() external onlyOperator {
        _pause();
    }

    function unpause() external onlyOperator {
        _unpause();
    }

    function _implementation() internal view returns (address) {
        bytes32 key = keccak256(abi.encodePacked('implementation'));
        address _impl = getAddressValue(key);
        require(_impl != address(0), 'Logic contract has not been registed yet');
        return _impl;
    }
}
