const {
    expectEvent,
    expectRevert,
    constants
} = require('@openzeppelin/test-helpers');
const { BN } = require('@openzeppelin/test-helpers/src/setup');
require('chai').should();
const { soliditySha3 } = require("web3-utils");

const Proxy = artifacts.require('Proxy');
const PrimaryStorage = artifacts.require('PrimaryStorage');
const Erc20Storage = artifacts.require('Erc20Storage');
const Erc20Logic = artifacts.require('Erc20Logic');
const DCLender = artifacts.require('DCLender');

const TYPE_MINTER = soliditySha3('TYPE_MINTER');
const TYPE_BURNER = soliditySha3('TYPE_BURNER');
const LimitPerAccount = '2000000';
const version = '1';

contract('DCLender', accounts => {
    before(async () => {
        this.erc20Logic = await Erc20Logic.new();
        this.primaryStorage = await PrimaryStorage.new();
        this.erc20Proxy = await Proxy.new(this.primaryStorage.address);
        this.erc20Storage = await Erc20Storage.new();
        this.dcLender = await DCLender.new();

        await this.primaryStorage.transferOwnership(this.erc20Proxy.address);
        await this.erc20Storage.updateTokenDetails('Digital Currency', 'WON', '0');
        await this.erc20Storage.transferOwnership(this.erc20Proxy.address);
        await this.erc20Proxy.addAdditionalStorage(this.erc20Storage.address);
        await this.erc20Proxy.updateLogicContract(this.erc20Logic.address, version);
        await this.erc20Proxy.addRoleType(TYPE_MINTER);
        await this.erc20Proxy.addRoleType(TYPE_BURNER);

        await this.dcLender.setLoanLimit(LimitPerAccount);
        await this.dcLender.setDCContract(this.erc20Proxy.address);

        await this.erc20Proxy.grantRole(TYPE_MINTER, accounts[0], { from: accounts[0] });
        await this.erc20Proxy.grantRole(TYPE_BURNER, accounts[0], { from: accounts[0] });
        this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);
    });

    describe('setDCContract function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcLender.setDCContract(constants.ZERO_ADDRESS, { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('setLoanLimit function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcLender.setLoanLimit('0', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('tokenFallback function', async () => {
        it('only DC Token contract can use the function', async () => {
            await expectRevert(
                this.dcLender.tokenFallback(constants.ZERO_ADDRESS, '0', '0x00', { from: accounts[0] }),
                'DCLender: Only DC Token Contract can use the function'
            );
        });
    });

    describe('transfer DCToken to DCLender', async () => {
        it('The owner of the DCLender contract can transfer DC Tokens to the Contract', async () => {
            await this.erc20Token.issue(accounts[0], '10000', {from: accounts[0]});
            const receipt = await this.erc20Token.transfer(this.dcLender.address, '10000', {from: accounts[0]});
            expectEvent(receipt, 'Transfer', {
                from: accounts[0],
                to: this.dcLender.address,
                value: '10000',
            });
        });
        it('the account does not lent dc cannot send dc token to the lender contract', async () => {
            await this.erc20Token.issue(accounts[1], '10000', {from: accounts[0]});
            await expectRevert(
                this.erc20Token.transfer(this.dcLender.address, '10000', {from: accounts[1]}),
                'Only borrower can send DC token to Lender'
            );
        });
    });

    describe('totalServiceAmount function', async () => {
        it('totalServiceAmount should return Amount of DC Tokens for Lending service', async () => {
            const result = await this.dcLender.totalServiceAmount();
            assert.equal(result, '10000');
        });
    });

    describe('transferDC', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcLender.transferDC(accounts[1], '1000', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('totalServiceAmount should be update after transfer DC Tokens from DCLender', async () => {
            await this.dcLender.transferDC(accounts[1], '1000', { from: accounts[0] });
            const result = await this.dcLender.totalServiceAmount();
            assert.equal(result, '9000');
        });
    });

    describe('getAvailableDCLoanAmount function', async () => {
        it('case1 - balanceOf DCLend < limit', async () => {
            const result = await this.dcLender.getAvailableDCLoanAmount(accounts[1]);
            assert.equal(result, '9000');
        });
        it('case2 - balanceOf DCLend > limit',  async () => {
            await this.erc20Token.issue(accounts[0], '10000000', { from: accounts[0] });
            await this.erc20Token.transfer(this.dcLender.address, '10000000', { from: accounts[0] });
            const result = await this.dcLender.getAvailableDCLoanAmount(accounts[1]);
            assert.equal(result, LimitPerAccount);
        });
    });

    describe('requestLend function', async () => {
        it('amount should not be bigger than availableDCLoanAmount', async () => {
            const result = await this.dcLender.getAvailableDCLoanAmount(accounts[1]);
            await expectRevert(
                this.dcLender.requestLend(result.addn(1000), { from: accounts[1]}),
                'request amount exceed limit'
            );
        });
        it('balance check after DC Loan has been executed', async () => {
            const balanceBeforeLoan = await this.erc20Token.balanceOf(accounts[1]);
            const amount = new BN('9000');
            await this.dcLender.requestLend(amount, { from: accounts[1] });
            const balanceAfterLoan = await this.erc20Token.balanceOf(accounts[1]);
            assert.equal(balanceAfterLoan.toString(), balanceBeforeLoan.add(amount).toString());
        });
    });

    describe('getLendedAmount function', async () => {
        it('amount of Lended should be return', async () => {
            const result = await this.dcLender.getLendedAmount(accounts[1]);
            assert.equal(result.toString(), '9000');
        });
    });

    describe('repayment', async () => {
        it('borrowers can send DC Tokens to lender contract for repayment', async () => {
            const lendedAmount1 = await this.dcLender.getLendedAmount(accounts[1]);
            const repaymentAmount = new BN('4000');
            await this.erc20Token.transfer(this.dcLender.address, repaymentAmount, { from: accounts[1] });
            const lendedAmount2 = await this.dcLender.getLendedAmount(accounts[1]);
            assert.equal(lendedAmount2.toString(), lendedAmount1.sub(repaymentAmount).toString());
        });
    });
});
