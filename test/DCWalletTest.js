const {
    expectEvent,
    expectRevert,
    constants
} = require('@openzeppelin/test-helpers');
const { BN } = require('@openzeppelin/test-helpers/src/setup');
require('chai').should();
const { soliditySha3 } = require('web3-utils');

const Proxy = artifacts.require('Proxy');
const PrimaryStorage = artifacts.require('PrimaryStorage');
const Erc20Storage = artifacts.require('Erc20Storage');
const Erc20Logic = artifacts.require('Erc20Logic');
const DCWallet = artifacts.require('DCWallet');
const DCLender = artifacts.require('DCLender');

const TYPE_MINTER = soliditySha3('TYPE_MINTER');
const TYPE_BURNER = soliditySha3('TYPE_BURNER');
const LimitPerAccount = '2000000';
const version = '1';

contract('DCWallet', accounts => {
    before(async () => {
        this.erc20Logic = await Erc20Logic.new();
        this.primaryStorage = await PrimaryStorage.new();
        this.erc20Proxy = await Proxy.new(this.primaryStorage.address);
        this.erc20Storage = await Erc20Storage.new();
        this.dcWallet = await DCWallet.new();
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
        await this.dcWallet.setDCContract(this.erc20Proxy.address);
        await this.dcWallet.setDCLenderContract(this.dcLender.address);

        await this.erc20Proxy.grantRole(TYPE_MINTER, accounts[0], { from: accounts[0] });
        await this.erc20Proxy.grantRole(TYPE_BURNER, accounts[0], { from: accounts[0] });
        this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);

        await this.erc20Token.issue(accounts[0], '1000000000', { from: accounts[0] });
        await this.erc20Token.transfer(this.dcLender.address, '1000000000', { from: accounts[0] });
    });

    describe('setDCContract function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcWallet.setDCContract(constants.ZERO_ADDRESS, { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('setDCLenderContract function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcWallet.setDCLenderContract(constants.ZERO_ADDRESS, { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('transferDC function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcWallet.transferDC(accounts[1], '1000', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
    });

    describe('approveDC function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcWallet.approveDC(accounts[1], '1000', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('spender can transfer DC Tokens in Wallet contract after approveDC', async () => {
            await this.erc20Token.issue(accounts[0], '1000', { from: accounts[0] });
            await this.erc20Token.transfer(this.dcWallet.address, '1000', { from: accounts[0] });
            await this.dcWallet.approveDC(accounts[1], '1000', { from: accounts[0] });
            const receipt = await this.erc20Token.transferFrom(this.dcWallet.address, accounts[1], '1000', { from: accounts[1] });
            expectEvent(receipt, 'Transfer', {
                from : this.dcWallet.address,
                to : accounts[1],
                value : '1000',
            });
        });
    });

    describe('lendDC function', async () => {
        it('only owner can use the function', async () => {
            await expectRevert(
                this.dcWallet.lendDC('20000', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('Amount of DC for lending should be lower than limit', async () => {
            const amount = new BN(LimitPerAccount);
            await expectRevert(
                this.dcWallet.lendDC(amount.addn(10000), { from: accounts[0] }),
                'request amount exceed limit'
            );
        });
        it('balance check after requestLend', async () => {
            const amount = new BN('20000');
            await this.dcWallet.lendDC(amount, { from: accounts[0] });
            const result = await this.erc20Token.balanceOf(this.dcWallet.address);
            assert.equal(amount.toString(), result);
        });
    });

    describe('getAvailableDCLoanAmount function', async () => {
        it('current limit amount for lending should be return', async () => {
            const result = await this.dcWallet.getAvailableDCLoanAmount();
            const lendedAmount = new BN('20000');
            const limit = new BN(LimitPerAccount);
            assert.equal(limit.sub(lendedAmount).toString(), result);
        });
    });

    describe('tokenFallback function', async () => {
        it('only DC Token contract can use the function', async () => {
            await expectRevert(
                this.dcWallet.tokenFallback(constants.ZERO_ADDRESS, '0', '0x00', { from: accounts[0] }),
                'DCWallet: Only DC Token Contract can use the function'
            );
        });
    });

    describe('repayment function', async () => {
        it('automatically repay lended DC Tokens if the wallet contract receives DC Tokens', async () => {
            const repayAmount = new BN('1000');
            const loanAmount = await this.dcLender.getLendedAmount(this.dcWallet.address);
            await this.erc20Token.issue(accounts[1], repayAmount, { from: accounts[0] });
            await this.erc20Token.transfer(this.dcWallet.address, repayAmount, { from: accounts[1] });
            const loanAmount2 = await this.dcLender.getLendedAmount(this.dcWallet.address);
            assert.equal(loanAmount.sub(repayAmount).toString(), loanAmount2.toString());
        });
        it('the wallet contract owner can repay directly by using transferDC function', async () => {
            const repayAmount = new BN('1000');
            const loanAmount = await this.dcLender.getLendedAmount(this.dcWallet.address);
            await this.dcWallet.transferDC(this.dcLender.address, repayAmount, { from: accounts[0] });
            const loanAmount2 = await this.dcLender.getLendedAmount(this.dcWallet.address);
            assert.equal(loanAmount.sub(repayAmount).toString(), loanAmount2.toString());
        });
        it('cannot send dc tokens more than lended amount', async () => {
            const loanAmount = await this.dcLender.getLendedAmount(this.dcWallet.address);
            await expectRevert(
                this.dcWallet.transferDC(this.dcLender.address, loanAmount.addn(100), { from: accounts[0] }),
                'SafeMath: subtraction overflow'
            );
        });
        it('extra amount of DC token should be remain after repay all', async () => {
            const loanAmount = await this.dcLender.getLendedAmount(this.dcWallet.address);
            const extras = new BN('10000');
            const tokenAmountToSend = extras.add(loanAmount);
            const remains1 = await this.erc20Token.balanceOf(this.dcWallet.address);
            await this.erc20Token.issue(accounts[1], tokenAmountToSend, { from: accounts[0] });
            await this.erc20Token.transfer(this.dcWallet.address, tokenAmountToSend, { from: accounts[1] });
            const remains2 = await this.erc20Token.balanceOf(this.dcWallet.address);
            const loanAmount2 = await this.dcLender.getLendedAmount(this.dcWallet.address);
            assert.equal(loanAmount2.toString(), new BN('0').toString());
            assert.equal(remains2.sub(remains1).toString(), extras.toString());
        });
    });
});
