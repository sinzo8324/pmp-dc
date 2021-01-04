const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const DataStorage = artifacts.require('DataStorage');
const IErc20ProxyI = artifacts.require('IErc20ProxyI');

contract('UpgradableErc20', accounts => {
  before(async () => {
    this.erc20Proxy = await Proxy.new();
    this.erc20Logic = await Erc20Logic.new();
    this.dataStorage = await DataStorage.new();

    await this.dataStorage.updateTokenDetails('HanwhaCBDC', 'WON', '0');
    await this.dataStorage.transferOwnership(this.erc20Proxy.address);
    await this.erc20Proxy.addDataStorage(this.dataStorage.address);
    await this.erc20Proxy.updateLogicContract(this.erc20Logic.address);

    this.erc20Token = await IErc20ProxyI.at(this.erc20Proxy.address);
    });

  describe('issue function', async () => {
    it('only owner can use the function', async () => {
      await expectRevert(
        this.erc20Token.issue(accounts[1], 1000000, { from: accounts[1] }),
        'Ownable: caller is not the owner'
        );
      });
    it('can not issue zero amount of token', async () => {
      await expectRevert(
        this.erc20Token.issue(accounts[1], 0, { from: accounts[0] }),
        'Can not mint zero amount'
        );
      });
    it('Transfer event should be emit after issuance has been finished successfully', async () => {
      const result = await this.erc20Token.issue(accounts[1], 1000000, { from: accounts[0] });
      expectEvent(result, 'Transfer', {
        from: constants.ZERO_ADDRESS,
        to: accounts[1],
        value: '1000000',
        });
      });
    });

  describe('redeem function', async () => {
    it('only owner can use the function', async () => {
      await expectRevert(
        this.erc20Token.redeem(accounts[1], 100, { from: accounts[1] }),
        'Ownable: caller is not the owner'
        );
      });
    it('can not redeem zero amount of token', async () => {
      await expectRevert(
        this.erc20Token.redeem(accounts[1], 0, { from: accounts[0] }),
        'Can not redeem zero amount'
        );
      });
    it('Transfer event should be emit after burning tokens has been finished successfully', async () => {
      const result = await this.erc20Token.redeem(accounts[1], 100, { from: accounts[0] });
      expectEvent(result, 'Transfer', {
        from: accounts[1],
        to: constants.ZERO_ADDRESS, 
        value: '100',
        });
      });
    });

  });
