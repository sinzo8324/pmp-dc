/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity 0.7.6;

import '../libraries/LibAccessControl.sol';
import '../libraries/Constants.sol';

contract AccessControlFacet {
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @dev Returns `true` if `account` has been granted `role`.
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return LibAccessControl._hasRole(role, account);
    }

    /**
     * @dev Returns the number of accounts that have `role`. Can be used
     * together with {getRoleMember} to enumerate all bearers of a role.
     */
    function getRoleMemberCount(bytes32 role) public view returns (uint256) {
        LibAccessControl.Storage storage fs = LibAccessControl.getStorage();
        return fs.roles[role].members.length();
    }

    /**
     * @dev Returns one of the accounts that have `role`. `index` must be a
     * value between 0 and {getRoleMemberCount}, non-inclusive.
     *
     * Role bearers are not sorted in any particular way, and their ordering may
     * change at any point.
     *
     * WARNING: When using {getRoleMember} and {getRoleMemberCount}, make sure
     * you perform all queries on the same block. See the following
     * https://forum.openzeppelin.com/t/iterating-over-elements-on-enumerableset-in-openzeppelin-contracts/2296[forum post]
     * for more information.
     */
    function getRoleMember(bytes32 role, uint256 index) public view returns (address) {
        LibAccessControl.Storage storage fs = LibAccessControl.getStorage();
        return fs.roles[role].members.at(index);
    }

    /**
     * @dev Returns the admin role that controls `role`. See {grantRole} and
     * {revokeRole}.
     *
     * To change a role's admin, use {_setRoleAdmin}.
     */
    function getRoleAdmin(bytes32 role) public view returns (bytes32) {
        LibAccessControl.Storage storage fs = LibAccessControl.getStorage();
        return fs.roles[role].adminRole;
    }

    function addRoleType(bytes32 role) external {
        require(hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
        LibAccessControl._setRoleAdmin(role, Constants.TYPE_OPERATOR);
    }

    /**
     * @dev Grants `role` to `account`.
     *
     * If `account` had not been already granted `role`, emits a {RoleGranted}
     * event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function grantRole(bytes32 role, address account) public {
        require(hasRole(getRoleAdmin(role), msg.sender), 'AccessControl: sender must be an admin to grant');
        LibAccessControl._grantRole(role, account);
    }

    /**
     * @dev Revokes `role` from `account`.
     *
     * If `account` had been granted `role`, emits a {RoleRevoked} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function revokeRole(bytes32 role, address account) public {
        require(hasRole(getRoleAdmin(role), msg.sender), 'AccessControl: sender must be an admin to revoke');
        LibAccessControl._revokeRole(role, account);
    }

    /**
     * @dev Revokes `role` from the calling account.
     *
     * Roles are often managed via {grantRole} and {revokeRole}: this function's
     * purpose is to provide a mechanism for accounts to lose their privileges
     * if they are compromised (such as when a trusted device is misplaced).
     *
     * If the calling account had been granted `role`, emits a {RoleRevoked}
     * event.
     *
     * Requirements:
     *
     * - the caller must be `account`.
     */
    function renounceRole(bytes32 role, address account) public {
        require(account == msg.sender, 'AccessControl: can only renounce roles for self');
        LibAccessControl._revokeRole(role, account);
    }
}
