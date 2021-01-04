/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';

contract RolesStorage is Ownable {

    event AccountAdded(address indexed account);
    event AccountRemoved(address indexed account);

    mapping (address => bool) bearer;

    function hasRole(address account) public view returns (bool) {
        require(account != address(0), "Roles: account is the zero address");
        return bearer[account];
    }

    function addAccount(address account) external onlyOwner {
        _addAccount(account);
    }

    function removeAccount(address account) external onlyOwner {
        _removeAccount(account);
    }

    function _addAccount(address account) internal {
        require(!hasRole(account), "Roles: account already has role");
        bearer[account] = true;
        emit AccountAdded(account);
    }

    function _removeAccount(address account) internal {
        require(hasRole(account), "Roles: account does not have role");
        bearer[account] = false;
        emit AccountRemoved(account);
    }
}
