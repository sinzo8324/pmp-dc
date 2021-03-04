// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import "../storages/AccessControl.sol";
import "../storages/Pausable.sol";
import '../libraries/Constants.sol';

contract PausableFacet {
    using EnumerableSet for EnumerableSet.AddressSet;

    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    modifier onlyOperator() {
        require(hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
        _;
    }

    function pause() external onlyOperator {
        _pause();
    }

    function unpause() external onlyOperator {
        _unpause();
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view returns (bool) {
        Pausable.PausableStorage storage fs = Pausable.pausableStorage();
        return fs.paused;
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function _pause() internal {
        Pausable.PausableStorage storage fs = Pausable.pausableStorage();
        require(fs.paused, "Pausable: paused");
        fs.paused = true;
        emit Paused(msg.sender);
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function _unpause() internal {
        Pausable.PausableStorage storage fs = Pausable.pausableStorage();
        require(fs.paused, "Pausable: not paused");
        fs.paused = false;
        emit Unpaused(msg.sender);
    }

    function hasRole(bytes32 role, address account) internal view returns (bool) {
        AccessControl.AccessControlStorage storage fs = AccessControl.accessControlStorage();
        return fs.roles[role].members.contains(account);
    }

}
