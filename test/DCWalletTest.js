const {
    expectEvent,
    expectRevert,
    constants
} = require('@openzeppelin/test-helpers');
const { BN } = require('@openzeppelin/test-helpers/src/setup');
require('chai').should();
const { soliditySha3 } = require('web3-utils');

const AccessControlFacet = artifacts.require('AccessControlFacet');
const DiamondCutFacet = artifacts.require('DiamondCutFacet');
const DiamondLoupeFacet = artifacts.require('DiamondLoupeFacet');
const Erc20Facet = artifacts.require('Erc20Facet');
const PausableFacet = artifacts.require('PausableFacet');
const DCInterface = artifacts.require('IDCContract');
const Diamond = artifacts.require('Diamond');
const DCWallet = artifacts.require('DCWallet');
const DCLender = artifacts.require('DCLender');

const TYPE_MINTER = soliditySha3('TYPE_MINTER');
const TYPE_BURNER = soliditySha3('TYPE_BURNER');
const LimitPerAccount = '2000000';
const version = '1';
const FacetCutAction = {
    Add: 0,
    Replace: 1,
    Remove: 2
}

function getSelectors (contract) {
    const selectors = contract.abi.reduce((acc, val) => {
        if (val.type === 'function') {
            acc.push(val.signature);
            return acc;
        } else {
            return acc;
        }
    }, []);
    return selectors;
}

contract('DCWallet', accounts => {
    before(async () => {
        this.accessControlFacet = await AccessControlFacet.new({ from: accounts[0] });
        this.diamondCutFacet = await DiamondCutFacet.new({ from: accounts[0] });
        this.diamondLoupeFacet = await DiamondLoupeFacet.new({ from: accounts[0] });
        this.erc20Facet = await Erc20Facet.new({ from: accounts[0] });
        this.pausableFacet = await PausableFacet.new({ from: accounts[0] });
        this.dcWallet = await DCWallet.new({ from: accounts[0] });
        this.dcLender = await DCLender.new({ from: accounts[0] });

        const diamondCut = [
            [this.diamondCutFacet.address, FacetCutAction.Add, getSelectors(DiamondCutFacet)],
            [this.diamondLoupeFacet.address, FacetCutAction.Add, getSelectors(DiamondLoupeFacet)],
            [this.accessControlFacet.address, FacetCutAction.Add, getSelectors(AccessControlFacet)],
            [this.erc20Facet.address, FacetCutAction.Add, getSelectors(Erc20Facet)],
            [this.pausableFacet.address, FacetCutAction.Add, getSelectors(PausableFacet)],
        ];

        this.diamond = await Diamond.new(diamondCut, { from: accounts[0] });
        this.erc20Token = await DCInterface.at(this.diamond.address);

        await this.erc20Token.updateTokenDetails('Digital Currency', 'WON', '0', { from: accounts[0] });
        await this.erc20Token.setVersion(version, { from: accounts[0] });
        await this.erc20Token.addRoleType(TYPE_MINTER, { from: accounts[0] });
        await this.erc20Token.addRoleType(TYPE_BURNER, { from: accounts[0] });

        await this.dcLender.setLoanLimit(LimitPerAccount, { from: accounts[0] });
        await this.dcLender.setDCContract(this.erc20Token.address, { from: accounts[0] });
        await this.dcWallet.setDCContract(this.erc20Token.address, { from: accounts[0] });
        await this.dcWallet.setDCLenderContract(this.dcLender.address, { from: accounts[0] });

        await this.erc20Token.grantRole(TYPE_MINTER, accounts[0], { from: accounts[0] });
        await this.erc20Token.grantRole(TYPE_BURNER, accounts[0], { from: accounts[0] });

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
