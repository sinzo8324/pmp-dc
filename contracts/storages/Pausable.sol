// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import '../libraries/Constants.sol';

library Pausable {
    struct PausableStorage {
        bool paused;
    }

    function pausableStorage() internal pure returns (PausableStorage storage fs) {
        bytes32 position = Constants.PAUSABLE_STORAGE_POSITION;
        assembly {
            fs.slot := position
        }
    }
}
