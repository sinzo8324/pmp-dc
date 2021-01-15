// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.12;

library RequestListLib {
    bytes32 constant HEAD = bytes32(0);
    struct RequestIDList{
        mapping (bytes32 => bytes32) reqIDList;
        uint256 totalLength;
    }

    function push(RequestIDList storage self, bytes32 reqID) public {
        bytes32 lastId = getLastId(self);
        self.reqIDList[lastId] = reqID;
        self.totalLength++;
    }

    function getLastId(RequestIDList storage self) public view returns(bytes32) {
        uint256 len = self.totalLength;
        bytes32 current = HEAD;
        for( uint256 i = 0; i < len; i++ ) {
            current = self.reqIDList[current];
        }
        return current;
    }

    function getLength(RequestIDList storage self) public view returns(uint256) {
        return self.totalLength;
    }

    function getNext(RequestIDList storage self, bytes32 reqID) public view returns(bytes32) {
        return self.reqIDList[reqID];
    }

    function getHead(RequestIDList storage self) public view returns(bytes32) {
        return self.reqIDList[HEAD];
    }

    function updateHead(RequestIDList storage self, bytes32 reqID) public {
        self.reqIDList[HEAD] = reqID;
    }

    function deleteReqID(RequestIDList storage self, bytes32 reqID) public {
        require(self.reqIDList[reqID] != 0, 'Cannot delete empty data');
        delete self.reqIDList[reqID];
        self.totalLength--;
    }

}