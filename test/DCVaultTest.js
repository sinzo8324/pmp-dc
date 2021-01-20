const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const keccak256 = require("web3-utils").soliditySha3;
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const DataStorage = artifacts.require('DataStorage');
const DCVault = artifacts.require('DCVault');

require("chai").should();

function generateRequestID(contractAddress, account, amount, count) {
  return keccak256(
    contractAddress,
    account,
    amount,
    count
  );
}

contract('DCVault', accounts => {
  before(async () => {
    this.erc20Proxy = await Proxy.new();
    this.erc20Logic = await Erc20Logic.new();
    this.dataStorage = await DataStorage.new();
    this.dcVault = await DCVault.new();

    await this.dataStorage.updateTokenDetails('Digital Currency', 'WON', '0');
    await this.dataStorage.transferOwnership(this.erc20Proxy.address);
    await this.erc20Proxy.addDataStorage(this.dataStorage.address);
    await this.erc20Proxy.updateLogicContract(this.erc20Logic.address);
    await this.dcVault.setDCContractAddress(this.erc20Proxy.address);
    await this.erc20Proxy.setInitialize(accounts[0], accounts[0], accounts[0], accounts[0]);

    this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);
    });

  describe('setDCContractAddress', async () => {
    it('Only the contract owner can use the function', async () => {
      await expectRevert(
        this.dcVault.setDCContractAddress(constants.ZERO_ADDRESS, {from: accounts[1]}),
        'Ownable: caller is not the owner'
        );
      });
    });

  describe('lockUpDC function', async () => {
    it('Only the contract owner can use the function', async () => {
      await expectRevert(
        this.dcVault.lockUpDC(accounts[2], '0', { from: accounts[1] }),
        'Ownable: caller is not the owner'
        );
      });
    it('amount cannot be zero', async () => {
      await expectRevert(
        this.dcVault.lockUpDC(accounts[2], '0', { from: accounts[0] }),
        'amount cannot be zero'
        );
      });
    it('user account should have enough balance', async () => {
      await expectRevert(
        this.dcVault.lockUpDC(accounts[1], '100', {from: accounts[0]}),
        'ERC20: transfer amount exceeds balance'
        );
      });
    it('user account should approve for CoinToHPoint Contract', async () => {
      for(let i = 1; i < 5; i++) {
        await this.erc20Token.issue(accounts[i], '10000', {from: accounts[0]});
      }
      await expectRevert(
        this.dcVault.lockUpDC(accounts[1], '100', {from: accounts[0]}),
        'ERC20: transfer amount exceeds allowance'
        );
      });
    it('DCLocked event should be emitted', async () => {
      for(let i = 1; i < 5; i++) {
        await this.erc20Token.approve(this.dcVault.address, '10000', {from: accounts[i]});
        const receipt = await this.dcVault.lockUpDC(accounts[i], '100', {from: accounts[0]});
        expectEvent(receipt, 'DCLocked', {
          requestID: generateRequestID(this.dcVault.address, accounts[i], '100', i - 1),
          source: accounts[i],
          amount: '100'
        });
      }
      });
    });

  describe('getPendingList function', async () => {
    it('can read request list with detail information on the contract', async () => {
      const result = await this.dcVault.getPendingList();
      for(let i = 0; i < 4; i++) {
        assert.equal(result[0][i], generateRequestID(this.dcVault.address, accounts[i + 1], '100', i));
        assert.equal(result[1][i], accounts[i + 1]);
        assert.equal(result[2][i].toString(), '100');
      }      
      });
    });
  
  describe('addTxHash function', async () => {
    it('only contract owner can call the function', async () => {
      const requestIDList = [generateRequestID(this.dcVault.address, accounts[1], '100', 0)];
      await expectRevert(
        this.dcVault.addTxHash(requestIDList, [constants.ZERO_BYTES32], {from: accounts[1]}),
        'Ownable: caller is not the owner'
        );
      });
    it('length of input arrays should be same with each others', async () => {
      let requestIDList = [];
      let txHashList = [];
      for(let i = 0; i < 4; i++) {
        requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
        txHashList.push(keccak256(i));
      }
      txHashList.push(keccak256(5));
      await expectRevert(
        this.dcVault.addTxHash(requestIDList, txHashList, {from: accounts[0]}),
        'length of input arrays should be same with each others'
        );
      });
    it('the input array length can not be bigger than length of request list on contract', async () => {
      let requestIDList = [];
      let txHashList = [];
      for(let i = 0; i < 6; i++) {
        requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
        txHashList.push(keccak256(i));
      }
      await expectRevert(
        this.dcVault.addTxHash(requestIDList, txHashList, {from: accounts[0]}),
        'length of input array cannot be bigger than pending list on the contract'
        );
      });
    it('the requestIDs order of input array should be match with the list on contract', async () => {
      let requestIDList = [];
      let txHashList = [];
      for(let i = 1; i < 4; i++) {
        requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
        txHashList.push(keccak256(i));
      }
      await expectRevert(
        this.dcVault.addTxHash(requestIDList, txHashList, {from: accounts[0]}),
        'input should be matched with pending list on the contract'
        );
      });
    it('Finished event should be emitted', async () => {
      let requestIDList = [];
      let txHashList = [];
      for(let i = 0; i < 3; i++) {
        requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
        txHashList.push(keccak256(i));
      }
      const receipt = await this.dcVault.addTxHash(requestIDList, txHashList, {from: accounts[0]});
      for(let i = 0;  i < requestIDList.length; i++){
        assert.equal(receipt.logs[i].event, 'Finished');
        assert.equal(receipt.logs[i].args.requestID, requestIDList[i]);
        assert.equal(receipt.logs[i].args.source, accounts[i+1]);
        assert.equal(receipt.logs[i].args.amount, '100');
      }
      });
    it('the remain requests should be stored in contracts', async () => {
      let result = await this.dcVault.getPendingList();
      const requestID = generateRequestID(this.dcVault.address, accounts[4], '100', 3);

      assert.equal(result[0][0], requestID);
      assert.equal(result[1][0], accounts[4]);
      assert.equal(result[2][0].toString(), '100');

      await this.dcVault.lockUpDC(accounts[2], '100', {from: accounts[0]});
      await this.dcVault.lockUpDC(accounts[3], '100', {from: accounts[0]});

      let requestIDList = [];
      requestIDList.push(generateRequestID(this.dcVault.address, accounts[2], '100', 4));
      requestIDList.push(generateRequestID(this.dcVault.address, accounts[3], '100', 5));

      result = await this.dcVault.getPendingList();
      assert.equal(result[0].length, 3);
      assert.equal(result[1].length, 3);
      assert.equal(result[2].length, 3);
      assert.equal(result[0][0], requestID);
      assert.equal(result[1][0], accounts[4]);
      assert.equal(result[2][0].toString(), '100');
      assert.equal(result[0][1], requestIDList[0]);
      assert.equal(result[1][1], accounts[2]);
      assert.equal(result[2][1].toString(), '100');
      assert.equal(result[0][2], requestIDList[1]);
      assert.equal(result[1][2], accounts[3]);
      assert.equal(result[2][2].toString(), '100');
      });
    });

  describe('unlockDC function', async () => {
    it('Only the contract owner can use the function', async () => {
      await expectRevert(
        this.dcVault.unlockDC(accounts[1], '100', { from: accounts[1] }),
        'Ownable: caller is not the owner'
        );
      });
    it('DCUnlocked event should be emitted', async () => {
      const balance1 = await this.erc20Token.balanceOf(accounts[1]);
      const receipt = await this.dcVault.unlockDC(accounts[1], '100', { from: accounts[0]});
      expectEvent(receipt, 'DCUnlocked', {
        toAddress: accounts[1],
        amount: '100'
        });
      const balance2 = await this.erc20Token.balanceOf(accounts[1]);
      assert.equal(balance1.addn(100).toString(), balance2.toString())
      });
    });
  });
  