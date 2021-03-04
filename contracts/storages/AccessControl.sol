// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import 'openzeppelin-solidity/contracts/utils/EnumerableSet.sol';
import '../libraries/Constants.sol';

library AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct RoleData {
        EnumerableSet.AddressSet members;
        bytes32 adminRole;
    }

    struct AccessControlStorage {
        mapping (bytes32 => RoleData) roles;
    }

    function accessControlStorage() internal pure returns (AccessControlStorage storage fs) {
        bytes32 position = Constants.ACCESSCONTROL_STORAGE_POSITION;
        assembly {
            fs.slot := position
        }
    }
}
