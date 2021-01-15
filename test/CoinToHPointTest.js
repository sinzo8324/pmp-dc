const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const DataStorage = artifacts.require('DataStorage');
const CoinToHPoint = artifacts.require('CoinToHPoint');
const RequestListLib = artifacts.require('RequestListLib');
require("chai")
  .should();

contract('Coin', accounts => {
  before(async () => {
    this.erc20Proxy = await Proxy.new();
    this.erc20Logic = await Erc20Logic.new();
    this.dataStorage = await DataStorage.new();
    this.requestListLib = await RequestListLib.new();
    await CoinToHPoint.link('RequestListLib', this.requestListLib.address);
    this.coinToHPoint = await CoinToHPoint.new();

    await this.dataStorage.updateTokenDetails('Digital Currency', 'WON', '0');
    await this.dataStorage.transferOwnership(this.erc20Proxy.address);
    await this.erc20Proxy.addDataStorage(this.dataStorage.address);
    await this.erc20Proxy.updateLogicContract(this.erc20Logic.address);
    await this.coinToHPoint.setCoin(this.erc20Proxy.address);
    await this.erc20Proxy.setInitialize(accounts[0], accounts[0], accounts[0], accounts[0]);

    this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);
    });

  describe('RequestHPointKlaytn function', async () => {
    it('toAddrOnKlaytn cannot be zero', async () => {
      await expectRevert(
        this.coinToHPoint.requestHPointKlaytn(constants.ZERO_ADDRESS, '1000000', { from: accounts[1] }),
        'target address cannot be zero'
        );
      });
    it('amount cannot be zero', async () => {
      await expectRevert(
        this.coinToHPoint.requestHPointKlaytn(accounts[2], '0', { from: accounts[1] }),
        'amount cannot be zero'
        );
      });
    it('user account should have enough balance', async () => {
      await expectRevert(
        this.coinToHPoint.requestHPointKlaytn(accounts[5], '100', {from: accounts[1]}),
        'ERC20: transfer amount exceeds balance'
        );
      });
    it('user account should approve for CoinToHPoint Contract', async () => {
      for(let i = 1; i < 5; i++) {
        await this.erc20Token.issue(accounts[i], '10000', {from: accounts[0]});
      }
      await expectRevert(
        this.coinToHPoint.requestHPointKlaytn(accounts[5], '100', {from: accounts[1]}),
        'ERC20: transfer amount exceeds allowance'
        );
      });
    it('RequestRecorded event should be emitted', async () => {
      for(let i = 1; i < 5; i++) {
        await this.erc20Token.approve(this.coinToHPoint.address, '10000', {from: accounts[i]});
        const receipt = await this.coinToHPoint.requestHPointKlaytn(accounts[i+4], '100', {from: accounts[i]});
        expectEvent(receipt, 'RequestRecorded', {
          requester: accounts[i],
          toAddrOnKlaytn: accounts[i+4],
          amount: '100',
        });
      }
      });
    });

  describe('getPendingList function', async () => {
    it('can read request list with detail information on the contract', async () => {
      const result = await this.coinToHPoint.getPendingList();
      for(let i = 0; i < 4; i++) {
        assert.equal(result[0][i], accounts[i + 1]);
        assert.equal(result[1][i], accounts[i + 5]);
        assert.equal(result[2][i].toString(), '100');
      }      
      });
    });
  
  describe('addTxHash function', async () => {
    it('only contract owner can call the function', async () => {
      const requester = [accounts[1]];
      const to = [accounts[5]];
      const amount = ['100'];
      await expectRevert(
        this.coinToHPoint.addTxHash(requester, to, amount, constants.ZERO_BYTES32, {from: accounts[1]}),
        'Ownable: caller is not the owner'
        );
      });
    it('the input array length can not be bigger than length of request list on contract', async () => {
      const requester = [accounts[2], accounts[3], accounts[4], accounts[5], accounts[6]];
      const to = [accounts[2], accounts[3], accounts[4], accounts[5], accounts[6]];
      const amount = ['100', '100', '100', '100', '100'];
      await expectRevert(
        this.coinToHPoint.addTxHash(requester, to, amount, constants.ZERO_BYTES32, {from: accounts[0]}),
        'input array length can not be bigger than request list length on the contract'
        );
      });
    it('the item order of input array should be match with request list on contract', async () => {
      const requester = [accounts[2], accounts[3], accounts[4], accounts[5]];
      const to = [accounts[6], accounts[7], accounts[8], accounts[9]];
      const amount = ['100', '100', '100', '100'];
      await expectRevert(
        this.coinToHPoint.addTxHash(requester, to, amount, constants.ZERO_BYTES32, {from: accounts[0]}),
        'input should be matched with pending list on the contract'
        );
      });
    it('finish event should be emitted', async () => {
      const requester = [accounts[1], accounts[2], accounts[3]];
      const to = [accounts[5], accounts[6], accounts[7]];
      const amount = ['100', '100', '100'];
      const receipt = await this.coinToHPoint.addTxHash(requester, to, amount, constants.ZERO_BYTES32, {from: accounts[0]});
      for(let i = 0;  i < requester.length; i++){
        assert.equal(receipt.logs[i].event, 'Finished');
        assert.equal(receipt.logs[i].args.requester, requester[i]);
        assert.equal(receipt.logs[i].args.toAddrOnKlaytn, to[i]);
        assert.equal(receipt.logs[i].args.amount, amount[i]);
      }
      });
    it('the remain requests should be stored in contracts', async () => {
      let result = await this.coinToHPoint.getPendingList();
      assert.equal(result[0][0], accounts[4]);
      assert.equal(result[1][0], accounts[8]);
      assert.equal(result[2][0].toString(), '100');

      await this.coinToHPoint.requestHPointKlaytn(accounts[8], '100', {from: accounts[4]});
      await this.coinToHPoint.requestHPointKlaytn(accounts[2], '100', {from: accounts[4]});

      result = await this.coinToHPoint.getPendingList();
      assert.equal(result[0][0], accounts[4]);
      assert.equal(result[1][0], accounts[8]);
      assert.equal(result[2][0].toString(), '100');
      assert.equal(result[0][1], accounts[4]);
      assert.equal(result[1][1], accounts[8]);
      assert.equal(result[2][1].toString(), '100');
      assert.equal(result[0][2], accounts[4]);
      assert.equal(result[1][2], accounts[2]);
      assert.equal(result[2][2].toString(), '100');
      });
    });
  });
  