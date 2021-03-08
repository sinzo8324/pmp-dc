// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.6;

library LibRequestList {
    struct RequestIDList{
        mapping (bytes32 => bytes32) next;
        mapping (bytes32 => bytes32) previous;
        uint256 totalLength;
        bytes32 head;
        bytes32 lastRequestID;
    }

    function push(RequestIDList storage self, bytes32 reqID) internal {
        if(self.head == bytes32(0)) {
            self.head = reqID;
        } else {
            self.next[self.lastRequestID] = reqID;
            self.previous[reqID] = self.lastRequestID;
        }
        self.lastRequestID = reqID;
        self.totalLength++;
    }

    function getLength(RequestIDList storage self) internal view returns(uint256) {
        return self.totalLength;
    }

    function getNext(RequestIDList storage self, bytes32 reqID) internal view returns(bytes32) {
        return self.next[reqID];
    }

    function getHead(RequestIDList storage self) internal view returns(bytes32) {
        return self.head;
    }

    function deleteReqID(RequestIDList storage self, bytes32 reqID) internal {
        if(self.head == reqID) {
            self.head = self.next[reqID];
            delete self.next[reqID];
            delete self.previous[self.head];
        } else if (self.lastRequestID == reqID) {
            self.lastRequestID = self.previous[reqID];
            delete self.previous[reqID];
            delete self.next[self.lastRequestID];
        } else {
            bytes32 previous = self.previous[reqID];
            bytes32 next = self.next[reqID];
            delete self.previous[reqID];
            delete self.next[reqID];
            self.next[previous] = next;
            self.previous[next] = previous;
        }
        self.totalLength--;
    }

}
