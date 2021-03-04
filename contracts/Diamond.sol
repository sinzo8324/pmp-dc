/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import "./libraries/LibDiamond.sol";
import "./libraries/LibAccessControl.sol";
import "./interfaces/IDiamondLoupe.sol";
import "./interfaces/IDiamondCut.sol";

contract Diamond {

    constructor(IDiamondCut.FacetCut[] memory _diamondCut) payable {
        LibDiamond.diamondCut(_diamondCut, address(0), new bytes(0));

        LibAccessControl._setRoleAdmin(LibAccessControl.TYPE_OPERATOR, LibAccessControl.TYPE_OPERATOR);
        LibAccessControl._setupRole(LibAccessControl.TYPE_OPERATOR, msg.sender);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external {
        LibDiamond.DiamondStorage storage ds;
        bytes32 position = LibDiamond.DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
        address facet = address(bytes20(ds.facetAddressAndSelectorPosition[msg.sig].facetAddress));
        require(facet != address(0), "Diamond: Function does not exist");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }

}
