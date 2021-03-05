/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

import './libraries/Constants.sol';
import './libraries/LibDiamond.sol';
import './libraries/LibAccessControl.sol';
import './interfaces/IDiamondCut.sol';

contract Diamond {

    constructor(IDiamondCut.FacetCut[] memory _diamondCut) {
        LibDiamond.diamondCut(_diamondCut, address(0), new bytes(0));
        LibAccessControl._setRoleAdmin(Constants.TYPE_OPERATOR, Constants.TYPE_OPERATOR);
        LibAccessControl._grantRole(Constants.TYPE_OPERATOR, msg.sender);
    }

    // Find facet for function that is called and execute the
    // function if a facet is found and return any value.
    fallback() external {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = address(bytes20(ds.facetAddressAndSelectorPosition[msg.sig].facetAddress));
        require(facet != address(0), 'Diamond: Function does not exist');
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
