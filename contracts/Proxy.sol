/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import './DataStorage.sol';

contract Proxy is Ownable {
    address[] public dataStorages;

    function() external {
        address _impl = DataStorage(dataStorages[0]).getLogicAddr();
        require(_impl != address(0), "Logic contract has not been registed yet");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), _impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    function addDataStorage(address _storageContract) external onlyOwner {
        dataStorages.push(_storageContract);
    }

    function updateDataStorage(uint256 _index, address _storageContract) external onlyOwner {
        dataStorages[_index] = _storageContract;
    }

    function updateLogicContract(address _logicContract) external onlyOwner {
        require(address(dataStorages[0]) != address(0), "storage has not been registed yet");
        DataStorage(dataStorages[0]).setLogicContract(_logicContract);
    }

    function transferStorageOwnership(uint256 _index, address _target) external onlyOwner {
        Ownable(dataStorages[_index]).transferOwnership(_target);
    }

    function getStorageList() external view returns (address[] memory) {
        return dataStorages;
    }
}
