// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import '../libraries/Constants.sol';

library PausableStorage {
    struct Storage {
        bool paused;
    }

    function getStorage() internal pure returns (Storage storage fs) {
        bytes32 position = Constants.PAUSABLE_STORAGE_POSITION;
        assembly {
            fs.slot := position
        }
    }
}
