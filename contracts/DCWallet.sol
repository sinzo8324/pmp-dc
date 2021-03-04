/*
 * SPDX-License-Identifier: UNLICENSED
 */
pragma solidity ^0.7.6;

import './interfaces/IERC223Recipient.sol';
import './DCLender.sol';
import 'openzeppelin-solidity/contracts/access/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC20/IERC20.sol';

contract DCWallet is Ownable, IERC223Recipient {
    IERC20 dcContract;
    DCLender dcLenderContract;

    function setDCContract(address dcContractAddress) external onlyOwner {
        dcContract = IERC20(dcContractAddress);
    }

    function setDCLenderContract(address dcLenderAddress) external onlyOwner {
        dcLenderContract = DCLender(dcLenderAddress);
    }

    function transferDC(address to, uint256 amount) external onlyOwner {
        dcContract.transfer(to, amount);
    }

    function approveDC(address spender, uint256 amount) external onlyOwner {
        dcContract.approve(spender, amount);
    }

    function lendDC(uint256 amount) external onlyOwner {
        dcLenderContract.requestLend(amount);
    }

    function getAvailableDCLoanAmount() external view returns (uint256) {
        return dcLenderContract.getAvailableDCLoanAmount(address(this));
    }

    function tokenFallback(address from, uint256 value, bytes calldata data) override external {
        require(_msgSender() == address(dcContract), 'DCWallet: Only DC Token Contract can use the function');
        if(from == address(dcLenderContract)) {
            return;
        }
        uint256 lendedAmount = dcLenderContract.getLendedAmount(address(this));
        if(lendedAmount == 0) {
            return;
        }
        uint256 repaymentAmount;
        if(value > lendedAmount) {
            repaymentAmount = lendedAmount;
        } else {
            repaymentAmount = value;
        }

        dcContract.transfer(address(dcLenderContract), repaymentAmount);
        // Todo: Does it need to check status of the lended amount?
        uint256 lendedAmountAfterRepayment = dcLenderContract.getLendedAmount(address(this));
        require(repaymentAmount == lendedAmount - lendedAmountAfterRepayment, 'DCWallet: Repayment Error'); 
        data;
    }
    
}
