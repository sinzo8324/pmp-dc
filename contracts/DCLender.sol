/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;

import './IERC223Recipient.sol';
import './DCLender.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

contract DCLender is Ownable, IERC223Recipient {
    using SafeMath for uint256;

    mapping (address => uint256) private _loanBook;
    uint256 public loanLimit;
    uint256 public totalServiceAmount;
    IERC20 dcContract;

    function setDCContract(address dcContractAddress) external onlyOwner {
        dcContract = IERC20(dcContractAddress);
    }

    function setLoanLimit(uint256 newLimit) external onlyOwner {
        loanLimit = newLimit;
    }

    function transferDC(address to, uint256 amount) external onlyOwner {
        totalServiceAmount = totalServiceAmount.sub(amount);
        dcContract.transfer(to, amount);
    }

    function requestLend(uint256 amount) external {
        uint256 availableAmount = getAvailableDCLoanAmount(_msgSender());
        require(amount < availableAmount, 'DCLender: request amount exceed limit');
        _loanBook[_msgSender()] = _loanBook[_msgSender()].add(amount);
        dcContract.transfer(_msgSender(), amount);
    }

    function getAvailableDCLoanAmount(address borrower) public view returns (uint256) {
        uint256 lended = _loanBook[borrower];
        uint256 remainAvailable = loanLimit.sub(lended);
        uint256 currentBalance = dcContract.balanceOf(address(this));
        if(currentBalance < remainAvailable) {
            remainAvailable = currentBalance;
        }
        return remainAvailable;
    }

    function getLendedAmount(address borrower) external view returns (uint256) {
        return _loanBook[borrower];
    }

    function tokenFallback(address from, uint256 value, bytes calldata data) override external {
        require(_msgSender() == address(dcContract), 'DCLender: Only DC Token Contract can use the function');
        if(from == owner()){
            totalServiceAmount = totalServiceAmount.add(value);
            return;
        }
        require(_loanBook[from] > 0, 'DCLender: Only borrower can send DC token to Lender');
        _loanBook[from] = _loanBook[from].sub(value);
        data;
    }
}
