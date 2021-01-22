const { time, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { keccak256, hexlify, defaultAbiCoder, toUtf8Bytes, solidityPack} = require('ethers/utils');
const { ecsign } = require('ethereumjs-util');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const DataStorage = artifacts.require('DataStorage');

const testAccountPrivateKey = '0xFACDC25AB42FD449CA9CD505AAE912BBFF3F5B1880F70B3F63E1C733128032A7';
const testAccount = web3.eth.accounts.privateKeyToAccount(testAccountPrivateKey).address;

const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);

async function getDomainSeparator(name, tokenAddress) {
  const chainId = '1';
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        chainId,
        tokenAddress
      ]
    )
  )
}

async function getApprovalDigest(name, contractAddr, ownerAddr, spenderAddr, amount, nonce, deadline) {
  const DOMAIN_SEPARATOR = await getDomainSeparator(name, contractAddr);
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      ['0x19', '0x01', DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, ownerAddr, spenderAddr, amount, nonce, deadline]
          )
        )
      ]
    )
  );
}

contract('Digital Currency', async ([deployer, compliance, minter, burner, operator, ...accounts]) => {
  before(async () => {
    this.erc20Proxy = await Proxy.new({from: deployer});
    this.erc20Logic = await Erc20Logic.new({from: deployer});
    this.dataStorage = await DataStorage.new({from: deployer});

    await this.dataStorage.updateTokenDetails('Digital Currency', 'WON', '0', {from: deployer});
    await this.dataStorage.transferOwnership(this.erc20Proxy.address, {from: deployer});
    await this.erc20Proxy.addDataStorage(this.dataStorage.address, {from: deployer});
    await this.erc20Proxy.updateLogicContract(this.erc20Logic.address, {from: deployer});
    await this.erc20Proxy.setInitialize(compliance, minter, burner, operator, {from: deployer});

    this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);
    });
 
  describe('setInitalize function', async () => {
    it('deployer renounce Operator role', async () => {
      await expectRevert(
        this.erc20Proxy.setInitialize(compliance, minter, burner, operator, {from: deployer}),
        'Caller is not the Operator'
      );
    });
    it('cannot initalize twice', async () => {
      await expectRevert(
        this.erc20Proxy.setInitialize(compliance, minter, burner, operator, {from: operator}),
        'The proxy contract has been initialied already'
      );
    });
  });

  describe('Check token details', async () => {
    it('Check Token name', async () => {
      const result = await this.erc20Token.name();
      assert.equal(result, 'Digital Currency');
    });
    it('Check Token Symbol', async () => {
      const result = await this.erc20Token.symbol();
      assert.equal(result, 'WON');
    });
    it('Check Token Decimals', async () => {
      const result = await this.erc20Token.decimals();
      assert.equal(result.toString(), '0');
    });
  });

  describe('issue function', async () => {
    it('only minter can use the function', async () => {
      await expectRevert(
        this.erc20Token.issue(accounts[0], 1000000, { from: accounts[0] }),
        'Caller is not the Minter'
        );
      });
    it('can not issue zero amount of token', async () => {
      await expectRevert(
        this.erc20Token.issue(accounts[0], 0, { from: minter }),
        'Can not mint zero amount'
        );
      });
    it('Transfer event should be emit after issuance has been finished successfully', async () => {
      const receipt = await this.erc20Token.issue(accounts[0], 1000000, { from: minter });
      expectEvent(receipt, 'Transfer', {
        from: constants.ZERO_ADDRESS,
        to: accounts[0],
        value: '1000000',
        });
      });
    });

  describe('redeem function', async () => {
    it('only burner can use the function', async () => {
      await expectRevert(
        this.erc20Token.redeem(accounts[0], 100, { from: deployer }),
        'Caller is not the Burner'
        );
      });
    it('can not redeem zero amount of token', async () => {
      await expectRevert(
        this.erc20Token.redeem(accounts[0], 0, { from: burner }),
        'Can not redeem zero amount'
        );
      });
    it('Transfer event should be emit after burning tokens has been finished successfully', async () => {
      const receipt = await this.erc20Token.redeem(accounts[0], 100, { from: burner });
      expectEvent(receipt, 'Transfer', {
        from: accounts[0],
        to: constants.ZERO_ADDRESS, 
        value: '100',
        });
      });
    });

  describe('transfer function', async () => {
    it('Token owner can transmit its owned tokens to the other accounts', async () => {
      const receipt = await this.erc20Token.transfer(accounts[1], '1000', { from: accounts[0]} );
      expectEvent(receipt, 'Transfer', {
        from: accounts[0],
        to: accounts[1],
        value: '1000',
      });
    });
    it('reverts when transferring tokens to the zero address', async () => {
      // Conditions that trigger a require statement can be precisely tested
      await expectRevert(
        this.erc20Token.transfer(constants.ZERO_ADDRESS, '100', { from: accounts[0] }),
        'ERC20: transfer to the zero address',
      );
    });
  });
  

  describe('pause function', async () => {
    it('only Operator can pause the contract', async () => {
      await expectRevert(
        this.erc20Token.pause({from: deployer}),
        'Caller is not the Operator'
        );
      });
    it('Paused event should be emit if the contract is paused', async () => {
      const receipt = await this.erc20Token.pause({ from: operator });
      expectEvent(receipt, 'Paused', {
        account: operator,
        });
      });
    it('can not pause if the state of the contract paused', async () => {
      await expectRevert(
        this.erc20Token.pause({from: operator }),
        'Pausable: paused'
        );
      });
    });
  describe('unpause function', async () => {
    it('only Operator can unpause the contract', async () => {
      await expectRevert(
        this.erc20Token.unpause({from: deployer}),
        'Caller is not the Operator'
        );
      });
    it('Unpaused event should be emit if the contract is unpaused', async () => {
      const receipt = await this.erc20Token.unpause({ from: operator });
      expectEvent(receipt, 'Unpaused', {
        account: operator,
        });
      });
    it('can not unpause if the state of the contract unpaused', async () => {
      await expectRevert(
        this.erc20Token.unpause({ from: operator }),
        'Pausable: not paused'
        );
      });
    });

  describe('permit function', async () => {
    it('deadline should be bigger than current unix time stamp', async () => {
      const nonce = await this.erc20Token.nonces(testAccount);
      const current = await time.latest();
      const deadline = current.subn(1000);
      const digest = await getApprovalDigest(
        'Digital Currency', this.erc20Token.address, testAccount, accounts[0], '1000', nonce.toString(), deadline.toString()
      );

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));

      await expectRevert(
        this.erc20Token.permit(testAccount, accounts[0], '1000', deadline, v, hexlify(r), hexlify(s)),
        'Erc20Logic: EXPIRED'
        );
      });
    it('Signature should be matched with input data', async () => {
      const nonce = await this.erc20Token.nonces(testAccount);
      const current = await time.latest();
      const deadline = current.addn(1000);
      const digest = await getApprovalDigest(
        'Digital Currency', this.erc20Token.address, testAccount, accounts[0], '100', nonce.toString(), deadline.toString()
      );

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));

      await expectRevert(
        this.erc20Token.permit(testAccount, accounts[0], '1000', deadline, v, hexlify(r), hexlify(s)),
        'Erc20Logic: INVALID_SIGNATURE'
        );
      });
    it('Approve event should be emitted after signature verified successfully', async () => {
      const nonce = await this.erc20Token.nonces(testAccount);
      const current = await time.latest();
      const deadline = current.addn(1000);
      const digest = await getApprovalDigest(
        'Digital Currency', this.erc20Token.address, testAccount, accounts[0], '1000', nonce.toString(), deadline.toString()
      );

      const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));

      const receipt = await this.erc20Token.permit(testAccount, accounts[0], '1000', deadline, v, hexlify(r), hexlify(s));

      expectEvent(receipt, 'Approval', {
        owner: testAccount,
        spender: accounts[0],
        value: '1000',
        });
      });
    it('transferFrom test after permit transaction was submitted', async () => {
      await this.erc20Token.issue(testAccount, 1000, { from: minter });
      const receipt = await this.erc20Token.transferFrom(testAccount, accounts[0], '1000', {from: accounts[0]});

      expectEvent(receipt, 'Transfer', {
        from: testAccount,
        to: accounts[0],
        value: '1000',
        });
      });
    });
  });
