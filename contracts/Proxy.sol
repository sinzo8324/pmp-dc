/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.6.12;

import 'openzeppelin-solidity/contracts/access/AccessControl.sol';
import 'openzeppelin-solidity/contracts/utils/Pausable.sol';
import './DataStorage.sol';

contract Proxy is AccessControl, Pausable {
    bytes32 public constant TYPE_COMPLIANCE = keccak256('TYPE_COMPLIANCE');
    bytes32 public constant TYPE_MINTER = keccak256('TYPE_MINTER');
    bytes32 public constant TYPE_BURNER = keccak256('TYPE_BURNER');
    bytes32 public constant TYPE_OPERATOR = keccak256('TYPE_OPERATOR');
    address[] public dataStorages;
    bool public initialized = false;

    modifier onlyOperator() {
        require(hasRole(TYPE_OPERATOR, _msgSender()), 'Caller is not the Operator');
        _;
    }

    constructor () public {
        address msgSender = _msgSender();
        _setupRole(TYPE_OPERATOR, msgSender);
    }

    fallback() external {
        require(initialized, 'Should initialize the proxy contract first');
        address _impl = DataStorage(dataStorages[0]).getLogicAddr();
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

    function setInitialize(address _compliance, address _minter, address _burner, address _operator) external onlyOperator {
        require(!initialized, 'The proxy contract has been initialied already');
        _setupRole(TYPE_COMPLIANCE, _compliance);
        _setupRole(TYPE_MINTER, _minter);
        _setupRole(TYPE_BURNER, _burner);
        _setupRole(TYPE_OPERATOR, _operator);
        _setRoleAdmin(TYPE_COMPLIANCE, TYPE_COMPLIANCE);
        _setRoleAdmin(TYPE_MINTER, TYPE_COMPLIANCE);
        _setRoleAdmin(TYPE_BURNER, TYPE_COMPLIANCE);
        _setRoleAdmin(TYPE_OPERATOR, TYPE_COMPLIANCE);
        renounceRole(TYPE_OPERATOR, _msgSender());
        initialized = true;
    }

    function addDataStorage(address _storageContract) external onlyOperator {
        dataStorages.push(_storageContract);
    }

    function updateDataStorage(uint256 _index, address _storageContract) external onlyOperator {
        dataStorages[_index] = _storageContract;
    }

    function updateLogicContract(address _logicContract) external onlyOperator {
        require(address(dataStorages[0]) != address(0), 'storage has not been registed yet');
        DataStorage(dataStorages[0]).setLogicContract(_logicContract);
    }

    function transferStorageOwnership(uint256 _index, address _target) external onlyOperator {
        Ownable(dataStorages[_index]).transferOwnership(_target);
    }

    function getStorageList() external view returns (address[] memory) {
        return dataStorages;
    }
}
