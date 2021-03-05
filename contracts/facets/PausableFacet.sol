// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;

import '../storages/Pausable.sol';
import '../libraries/Constants.sol';
import '../libraries/LibAccessControl.sol';

contract PausableFacet {
    /**
     * @dev Emitted when the pause is triggered by `account`.
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by `account`.
     */
    event Unpaused(address account);

    modifier onlyOperator() {
        require(_hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
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
        require(fs.paused, 'Pausable: paused');
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
        require(fs.paused, 'Pausable: not paused');
        fs.paused = false;
        emit Unpaused(msg.sender);
    }

    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        return LibAccessControl._hasRole(role, account);
    }

}
