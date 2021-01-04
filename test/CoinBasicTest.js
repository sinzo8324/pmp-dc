const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const DataStorage = artifacts.require('DataStorage');
const IErc20ProxyI = artifacts.require('IErc20ProxyI');
require("chai")
  .should();

contract('Coin', ([admin, sender, receiver]) => {
  before(async () => {
    this.erc20Proxy = await Proxy.new();
    this.erc20Logic = await Erc20Logic.new();
    this.dataStorage = await DataStorage.new();

    await this.dataStorage.updateTokenDetails('HanwhaCoin', 'WON', '0');
    await this.dataStorage.transferOwnership(this.erc20Proxy.address);
    await this.erc20Proxy.addDataStorage(this.dataStorage.address);
    await this.erc20Proxy.updateLogicContract(this.erc20Logic.address);

    this.erc20Token = await IErc20ProxyI.at(this.erc20Proxy.address);
    });
 
  it('reverts when transferring tokens to the zero address', async () => {
    // Conditions that trigger a require statement can be precisely tested
    await expectRevert(
      this.erc20Token.transfer(constants.ZERO_ADDRESS, '100', { from: sender }),
      'ERC20: transfer to the zero address',
    );
  });

  it('only contract owner can issue tokens', async () => {
    await expectRevert(
      this.erc20Token.issue(sender, '10000', { from: sender }),
      'Ownable: caller is not the owner',
    )

    let receipt = await this.erc20Token.issue(sender, '10000', { from: admin });
 
    // Event assertions can verify that the arguments are the expected ones
    expectEvent(receipt, 'Transfer', {
      from: constants.ZERO_ADDRESS,
      to: sender,
      value: '10000',
    });
  });

  it('emits a Transfer event on successful transfers', async () => {
    const receipt = await this.erc20Token.transfer(receiver, '100', { from: sender });
                          
    // Event assertions can verify that the arguments are the expected ones
    expectEvent(receipt, 'Transfer', {
      from: sender,
      to: receiver,
      value: '100',
    });
  });

  it('updates balances on successful transfers', async () => {
    await this.erc20Token.transfer(receiver, '100', { from: sender });

    const result = await this.erc20Token.balanceOf(receiver);
      result.should.be.bignumber.equal('200');
  });
});