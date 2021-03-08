/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;

import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import './interfaces/IDCContract.sol';
import './interfaces/IERC223Recipient.sol';
import './libraries/LibRequestList.sol';

contract DCVault is Ownable, IERC223Recipient {
    using LibRequestList for LibRequestList.RequestIDList;

    struct PendingReq {
        address source;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 requestCnt;
    uint256 public totalLocked;
    uint256 constant GUARDTIME = 1800;
    LibRequestList.RequestIDList internal reqIDList;
    mapping (bytes32 => PendingReq) pendingList;

    event DCLocked(bytes32 indexed requestID, address indexed source, uint256 amount);
    event Finished(bytes32 indexed requestID, address indexed source, uint256 amount, bytes32 txHash);
    event DCUnlocked(address indexed toAddress, uint256 amount);

    address dcContractAddress;

    function setDCContractAddress(address contractAddress) external onlyOwner {
        dcContractAddress = contractAddress;
    }

    function getPendingList() external view returns (bytes32[] memory, address[] memory, uint256[] memory) {
        uint256 totalRequests = reqIDList.getLength();
        bytes32[] memory requestIDList = new bytes32[](totalRequests);
        address[] memory sourceAddrList = new address[](totalRequests);
        uint256[] memory amountList = new uint256[](totalRequests);
        bytes32 reqID = reqIDList.getHead();

        for(uint256 i = 0; i < totalRequests; i++) {
            requestIDList[i] = reqID;
            sourceAddrList[i] = pendingList[reqID].source;
            amountList[i] = pendingList[reqID].amount;
            reqID = reqIDList.getNext(reqID);
        }

        return (requestIDList, sourceAddrList, amountList);
    }

    function lockUpDC(address source, uint256 amount) public onlyOwner {
        require(amount !=0, 'amount cannot be zero');
        require(IDCContract(dcContractAddress).transferFrom(source, address(this), amount), 'can not take DC from the account');
        bytes32 reqID = keccak256(abi.encodePacked(address(this), source, amount, requestCnt++));
        reqIDList.push(reqID);
        pendingList[reqID] = PendingReq(source, amount, block.timestamp);
        totalLocked = totalLocked + amount;
        emit DCLocked(reqID, source, amount);
    }

    function mintDCnLockUp(
        address source,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
        ) external onlyOwner {
        // erc 2612 function for performing approve
        IDCContract(dcContractAddress).permit(source, address(this), amount, deadline, v, r, s);
        // mint DC
        // DCVault should have mint privilege
        IDCContract(dcContractAddress).issue(source, amount);
        // take dc token from source
        lockUpDC(source, amount);
        }

    function addTxHash(bytes32[] calldata requestIDList, bytes32[] calldata txHash) external onlyOwner {
        require(requestIDList.length == txHash.length, 'length of input arrays should be same with each others');
        require(requestIDList.length < reqIDList.getLength(), 'length of input array cannot be bigger than pending list on the contract');
        for(uint256 i = 0; i < requestIDList.length; i++){
            require(pendingList[requestIDList[i]].timestamp != 0, 'Invalid request ID');
            address source = pendingList[requestIDList[i]].source;
            uint256 amount = pendingList[requestIDList[i]].amount;
            delete pendingList[requestIDList[i]];
            reqIDList.deleteReqID(requestIDList[i]);
            emit Finished(requestIDList[i], source, amount, txHash[i]);
        }
    }

    function unlockDC(address destination, uint256 amount) public onlyOwner {
        IDCContract(dcContractAddress).transfer(destination, amount);
        totalLocked = totalLocked - amount;
        emit DCUnlocked(destination, amount);
    }

    function unlockDCnBurn(address destination, uint256 amount) external onlyOwner {
        // emit DC to destination account
        unlockDC(destination, amount);
        // burn DC in destination account
        // DCVault should have Burn privilege
        IDCContract(dcContractAddress).redeem(destination, amount);
    }

    function cancelRequest(bytes32 requestID) external onlyOwner {
        require(pendingList[requestID].timestamp != 0, 'Invalid request ID');
        require((pendingList[requestID].timestamp + GUARDTIME) < block.timestamp, 'Request cannot be canceled during the guard time');
        address destination = pendingList[requestID].source;
        uint256 amount = pendingList[requestID].amount;
        // delete request
        delete pendingList[requestID];
        // delete requestID
        reqIDList.deleteReqID(requestID);
        // unlockDC
        unlockDC(destination, amount);
    }

    function tokenFallback(address from, uint256 value, bytes memory data) override external {
        require(_msgSender() == dcContractAddress, 'DCVault: Only DC Token Contract can use the function');
        from;
        value;
        data;
    }

    // function unlockDC(address[] calldata destination, uint256[] calldata amount) external onlyOwner {
    //     for(uint256 i = 0; i < destination.length; i++) {
    //         IERC20(dcContractAddress).transfer(destination[i], amount[i]);
    //         emit DCUnlocked(destination[i], amount[i]);
    //     }
    // }
}
