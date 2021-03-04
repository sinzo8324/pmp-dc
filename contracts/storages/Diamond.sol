// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import '../libraries/Constants.sol';

library Diamond {

    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint16 selectorPosition;
    }

    struct DiamondStorage {
        // function selector => facet address and selector position in selectors array
        mapping(bytes4 => FacetAddressAndSelectorPosition) facetAddressAndSelectorPosition;
        bytes4[] selectors;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = Constants.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }
}
