/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.5.6;

import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './KIP7Logic.sol';
import './RequestListLib.sol';

contract HPointToCoin is Ownable{
    using SafeMath for uint256;
    using RequestListLib for RequestListLib.RequestIDList;

    struct PendingReq {
        address from;
        address to;
        uint256 amount;
    }

    uint256 cnt;
    RequestListLib.RequestIDList internal reqIDList;
    mapping (bytes32 => PendingReq) pendingList;

    event RequestRecorded(address indexed requester, address indexed toAddrOnCoin, uint256 amount);
    event Finished(address indexed requester, address indexed toAddrOnKlaytn, uint256 amount, bytes32 txHash);

    address hPointAddress;

    function setHPoint(address hPointAddr) external onlyOwner {
        hPointAddress = hPointAddr;
    }

    function getPendingList() external view returns (address[] memory, address[] memory, uint256[] memory) {
        uint256 totalRequests = reqIDList.getLength();
        address[] memory fromAddrList = new address[](totalRequests);
        address[] memory toAddrList = new address[](totalRequests);
        uint256[] memory amountList = new uint256[](totalRequests);

        bytes32 reqID = reqIDList.getHead();
        for(uint256 i = 0; i < totalRequests; i++) {
            fromAddrList[i] = pendingList[reqID].from;
            toAddrList[i] = pendingList[reqID].to;
            amountList[i] = pendingList[reqID].amount;
            reqID = reqIDList.getNext(reqID);
        }

        return (fromAddrList, toAddrList, amountList);
    }

    function requestCoin(address toAddrOnCoin, uint256 amount) external {
        require(toAddrOnCoin != address(0), 'target address cannot be zero');
        require(amount !=0, 'amount cannot be zero');
        require(KIP7Logic(hPointAddress).transferFrom(_msgSender(), address(this), amount), 'can not take HPoint from the account');

        bytes32 reqID = keccak256(abi.encodePacked(_msgSender(), toAddrOnCoin, amount, cnt++));
        PendingReq memory newReq;
        reqIDList.push(reqID);
        newReq = PendingReq(_msgSender(), toAddrOnCoin, amount);
        pendingList[reqID] = newReq;

        emit RequestRecorded(_msgSender(), toAddrOnCoin, amount);
    }

    function addTxHash(address[] calldata requester, address[] calldata to, uint256[] calldata amount, bytes32 txHash) external onlyOwner {
        require(reqIDList.getLength() >= requester.length, 'input array length can not be bigger than request list length on the contract');
        uint256 totalAmountToBurn = 0;
        bytes32 currentReqId = reqIDList.getHead();
        bytes32 nextReqId = reqIDList.getNext(currentReqId);
        for(uint256 i = 0; i < requester.length; i++){
            require(pendingList[currentReqId].from == requester[i] && pendingList[currentReqId].to == to[i] && pendingList[currentReqId].amount == amount[i], 'input should be matched with pending list on the contract');
            totalAmountToBurn = totalAmountToBurn.add(amount[i]);
            delete pendingList[currentReqId];
            reqIDList.deleteReqID(currentReqId);
            currentReqId = nextReqId;
            nextReqId = reqIDList.getNext(currentReqId);
            emit Finished(requester[i], to[i], amount[i], txHash);    
        }
        reqIDList.updateHead(currentReqId);
        KIP7Logic(hPointAddress).burn(address(this), totalAmountToBurn);
    }
}
