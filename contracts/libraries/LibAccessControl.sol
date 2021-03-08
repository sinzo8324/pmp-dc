// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import 'openzeppelin-solidity/contracts/utils/EnumerableSet.sol';
import '../libraries/Constants.sol';

library LibAccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct RoleData {
        EnumerableSet.AddressSet members;
        bytes32 adminRole;
    }

    struct Storage {
        mapping (bytes32 => RoleData) roles;
    }


    /**
     * @dev Emitted when `newAdminRole` is set as ``role``'s admin role, replacing `previousAdminRole`
     *
     * `DEFAULT_ADMIN_ROLE` is the starting admin for all roles, despite
     * {RoleAdminChanged} not being emitted signaling this.
     *
     * _Available since v3.1._
     */
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);

    /**
     * @dev Emitted when `account` is granted `role`.
     *
     * `sender` is the account that originated the contract call, an admin role
     * bearer except when using {_setupRole}.
     */
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);

    /**
     * @dev Emitted when `account` is revoked `role`.
     *
     * `sender` is the account that originated the contract call:
     *   - if using `revokeRole`, it is the admin role bearer
     *   - if using `renounceRole`, it is the role bearer (i.e. `account`)
     */
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);


    function getStorage() internal pure returns (Storage storage fs) {
        bytes32 position = Constants.ACCESSCONTROL_STORAGE_POSITION;
        assembly {
            fs.slot := position
        }
    }

    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        Storage storage fs = getStorage();
        return fs.roles[role].members.contains(account);
    }

    /**
     * @dev Sets `adminRole` as ``role``'s admin role.
     *
     * Emits a {RoleAdminChanged} event.
     */
    function _setRoleAdmin(bytes32 role, bytes32 adminRole) internal {
        Storage storage fs = getStorage();
        emit RoleAdminChanged(role, fs.roles[role].adminRole, adminRole);
        fs.roles[role].adminRole = adminRole;
    }

    function _grantRole(bytes32 role, address account) internal {
        Storage storage fs = getStorage();
        if (fs.roles[role].members.add(account)) {
            emit RoleGranted(role, account, msg.sender);
        }
    }

    function _revokeRole(bytes32 role, address account) internal {
        Storage storage fs = getStorage();
        if (fs.roles[role].members.remove(account)) {
            emit RoleRevoked(role, account, msg.sender);
        }
    }
}
