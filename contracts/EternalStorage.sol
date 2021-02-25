/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.6.12;

abstract contract EternalStorage {
    mapping(bytes32 => uint256) internal _uintStorage;
    mapping(bytes32 => string) internal _stringStorage;
    mapping(bytes32 => address) internal _addressStorage;
    mapping(bytes32 => bytes) internal _bytesStorage;
    mapping(bytes32 => bool) internal _boolStorage;
    mapping(bytes32 => int256) internal _intStorage;
    mapping(bytes32 => bytes32) internal _bytes32Storage;

    mapping(bytes32 => bytes32[]) internal _bytes32ArrayStorage;
    mapping(bytes32 => uint256[]) internal _uintArrayStorage;
    mapping(bytes32 => address[]) internal _addressArrayStorage;
    mapping(bytes32 => string[]) internal _stringArrayStorage;

    function set(bytes32 key, uint256 value) internal {
        _uintStorage[key] = value;
    }

    function set(bytes32 key, address value) internal {
        _addressStorage[key] = value;
    }

    function set(bytes32 key, bool value) internal {
        _boolStorage[key] = value;
    }

    function set(bytes32 key, bytes32 value) internal {
        _bytes32Storage[key] = value;
    }

    function set(bytes32 key, string memory value) internal {
        _stringStorage[key] = value;
    }

    function set(bytes32 key, bytes memory value) internal {
        _bytesStorage[key] = value;
    }

    function deleteArrayAddress(bytes32 key, uint256 index) internal {
        address[] storage array = _addressArrayStorage[key];
        require(index < array.length, "Index should less than length of the array");
        array[index] = array[array.length - 1];
        array.pop();
    }

    function deleteArrayBytes32(bytes32 key, uint256 index) internal {
        bytes32[] storage array = _bytes32ArrayStorage[key];
        require(index < array.length, "Index should less than length of the array");
        array[index] = array[array.length - 1];
        array.pop();
    }

    function deleteArrayUint(bytes32 key, uint256 index) internal {
        uint256[] storage array = _uintArrayStorage[key];
        require(index < array.length, "Index should less than length of the array");
        array[index] = array[array.length - 1];
        array.pop();
    }

    function deleteArrayString(bytes32 key, uint256 index) internal {
        string[] storage array = _stringArrayStorage[key];
        require(index < array.length, "Index should less than length of the array");
        array[index] = array[array.length - 1];
        array.pop();
    }

    function pushArray(bytes32 key, address value) internal {
        _addressArrayStorage[key].push(value);
    }

    function pushArray(bytes32 key, bytes32 value) internal {
        _bytes32ArrayStorage[key].push(value);
    }

    function pushArray(bytes32 key, string memory value) internal {
        _stringArrayStorage[key].push(value);
    }

    function pushArray(bytes32 key, uint256 value) internal {
        _uintArrayStorage[key].push(value);
    }

    function setArray(bytes32 key, address[] memory value) internal {
        _addressArrayStorage[key] = value;
    }

    function setArray(bytes32 key, uint256[] memory value) internal {
        _uintArrayStorage[key] = value;
    }

    function setArray(bytes32 key, bytes32[] memory value) internal {
        _bytes32ArrayStorage[key] = value;
    }

    function setArray(bytes32 key, string[] memory value) internal {
        _stringArrayStorage[key] = value;
    }

    function getArrayAddress(bytes32 key) public view returns(address[] memory) {
        return _addressArrayStorage[key];
    }

    function getArrayBytes32(bytes32 key) public view returns(bytes32[] memory) {
        return _bytes32ArrayStorage[key];
    }

    function getArrayUint(bytes32 key) public view returns(uint[] memory) {
        return _uintArrayStorage[key];
    }

    function setArrayIndexValue(bytes32 key, uint256 index, address value) internal {
        _addressArrayStorage[key][index] = value;
    }

    function setArrayIndexValue(bytes32 key, uint256 index, uint256 value) internal {
        _uintArrayStorage[key][index] = value;
    }

    function setArrayIndexValue(bytes32 key, uint256 index, bytes32 value) internal {
        _bytes32ArrayStorage[key][index] = value;
    }

    function setArrayIndexValue(bytes32 key, uint256 index, string memory value) internal {
        _stringArrayStorage[key][index] = value;
    }

    function getUintValue(bytes32 variable) public view returns(uint256) {
        return _uintStorage[variable];
    }

    function getBoolValue(bytes32 variable) public view returns(bool) {
        return _boolStorage[variable];
    }

    function getStringValue(bytes32 variable) public view returns(string memory) {
        return _stringStorage[variable];
    }

    function getAddressValue(bytes32 variable) public view returns(address) {
        return _addressStorage[variable];
    }

    function getBytes32Value(bytes32 variable) public view returns(bytes32) {
        return _bytes32Storage[variable];
    }

    function getBytesValue(bytes32 variable) public view returns(bytes memory) {
        return _bytesStorage[variable];
    }
}
