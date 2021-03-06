// SPDX-License-Identifier: MIT
pragma solidity 0.7.6;
pragma experimental ABIEncoderV2;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamond Standard: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/

import '../interfaces/IDiamondCut.sol';
import '../libraries/LibDiamond.sol';
import '../libraries/LibAccessControl.sol';
import '../libraries/Constants.sol';

contract DiamondCutFacet is IDiamondCut {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         a function with delegatecall
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    ///                  _calldata is executed with delegatecall on _init
    function diamondCut(
        FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        require(_hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
        emit DiamondCut(_diamondCut, _init, _calldata);
    }

    function setVersion(string calldata version) external {
        require(_hasRole(Constants.TYPE_OPERATOR, msg.sender), 'Caller is not the Operator');
        LibDiamond.Storage storage fs = LibDiamond.getStorage();
        fs.version = version;
    }

    function getVersion() external view returns (string memory) {
        return LibDiamond.getVersion();
    }

    function _hasRole(bytes32 role, address account) internal view returns (bool) {
        return LibAccessControl._hasRole(role, account);
    }
}
