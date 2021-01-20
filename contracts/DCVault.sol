/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.6.12;

import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import './RequestListLib.sol';

contract DCVault is Ownable {
    using RequestListLib for RequestListLib.RequestIDList;

    struct PendingReq {
        address source;
        uint256 amount;
    }

    uint256 requestCnt;
    RequestListLib.RequestIDList internal reqIDList;
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
        require(IERC20(dcContractAddress).transferFrom(source, address(this), amount), 'can not take DC from the account');
        bytes32 reqID = keccak256(abi.encodePacked(address(this), source, amount, requestCnt++));
        reqIDList.push(reqID);
        pendingList[reqID] = PendingReq(source, amount);

        emit DCLocked(reqID, source, amount);
    }

    function addTxHash(bytes32[] calldata requestIDList, bytes32[] calldata txHash) external onlyOwner {
        require(requestIDList.length == txHash.length, 'length of input arrays should be same with each others');
        require(requestIDList.length < reqIDList.getLength(), 'length of input array cannot be bigger than pending list on the contract');
        bytes32 currentReqId = reqIDList.getHead();
        bytes32 nextReqId = reqIDList.getNext(currentReqId);
        for(uint256 i = 0; i < requestIDList.length; i++){
            require(currentReqId == requestIDList[i], 'input should be matched with pending list on the contract');
            address source = pendingList[currentReqId].source;
            uint256 amount = pendingList[currentReqId].amount;
            delete pendingList[currentReqId];
            reqIDList.deleteReqID(currentReqId);
            currentReqId = nextReqId;
            nextReqId = reqIDList.getNext(currentReqId);
            emit Finished(requestIDList[i], source, amount, txHash[i]);
        }
        reqIDList.updateHead(currentReqId);
    }

    function unlockDC(address destination, uint256 amount) external onlyOwner {
        IERC20(dcContractAddress).transfer(destination, amount);
        emit DCUnlocked(destination, amount);
    }

    // function unlockDC(address[] calldata destination, uint256[] calldata amount) external onlyOwner {
    //     for(uint256 i = 0; i < destination.length; i++) {
    //         IERC20(dcContractAddress).transfer(destination[i], amount[i]);
    //         emit DCUnlocked(destination[i], amount[i]);
    //     }
    // }
}
