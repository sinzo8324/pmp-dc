const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const KIP7Logic = artifacts.require('KIP7Logic');
const DataStorage = artifacts.require('DataStorage');
const RolesStorage = artifacts.require('RolesStorage');

require("chai")
  .should();

contract('HPoint', ([admin, sender, receiver]) => {
  before(async () => {
    this.proxy = await Proxy.new();
    this.kip7Logic = await KIP7Logic.new();
    this.dataStorage = await DataStorage.new();
    this.rolesStorage = await RolesStorage.new();

    await this.dataStorage.updateTokenDetails('HPoint', 'HP', '0');
    await this.dataStorage.transferOwnership(this.proxy.address);
    await this.rolesStorage.transferOwnership(this.proxy.address);

    await this.proxy.addDataStorage(this.dataStorage.address);
    await this.proxy.addDataStorage(this.rolesStorage.address);
    await this.proxy.updateLogicContract(this.kip7Logic.address);

    this.kip7Token = await KIP7Logic.at(this.proxy.address);
    });
 
  it('reverts when transferring tokens to the zero address', async () => {
    // Conditions that trigger a require statement can be precisely tested
    await expectRevert(
      this.kip7Token.transfer(constants.ZERO_ADDRESS, '100', { from: sender }),
      'KIP7: transfer to the zero address',
    );
  });

  it('only contract owner can issue tokens', async () => {
    await expectRevert(
      this.kip7Token.mint(sender, '10000', { from: sender }),
      'Ownable: caller is not the owner',
    )

    let receipt = await this.kip7Token.mint(sender, '10000', { from: admin });
 
    // Event assertions can verify that the arguments are the expected ones
    expectEvent(receipt, 'Transfer', {
      from: constants.ZERO_ADDRESS,
      to: sender,
      value: '10000',
    });
  });

  it('emits a Transfer event on successful transfers', async () => {
    const receipt = await this.kip7Token.transfer(receiver, '100', { from: sender });
                          
    // Event assertions can verify that the arguments are the expected ones
    expectEvent(receipt, 'Transfer', {
      from: sender,
      to: receiver,
      value: '100',
    });
  });

  it('updates balances on successful transfers', async () => {
    await this.kip7Token.transfer(receiver, '100', { from: sender });

    const result = await this.kip7Token.balanceOf(receiver);
      result.should.be.bignumber.equal('200');
  });

  it('only contract owner can grant burn privilege', async () => {
    await expectRevert(
      this.kip7Token.grantBurnPrivilege(admin, { from: sender }),
      'Ownable: caller is not the owner',
    )

    await this.kip7Token.grantBurnPrivilege(admin, { from: admin });
  });

  it('only account has burn privilege can burn tokens', async () => {
    await expectRevert(
      this.kip7Token.burn(receiver, '10', {from: sender}),
      'Account does not have privilege'
    );

    await this.kip7Token.burn(receiver, '10', {from: admin});
    const result = await this.kip7Token.balanceOf(receiver);
    result.should.be.bignumber.equal('190');
  });

  it('only contract owner can revoke burn privilege', async () => {
    await expectRevert(
      this.kip7Token.revokeBurnPrivilege(admin, { from: sender }),
      'Ownable: caller is not the owner',
    )

    await this.kip7Token.revokeBurnPrivilege(admin, { from: admin });

    await expectRevert(
      this.kip7Token.burn(receiver, '10', {from: admin}),
      'Account does not have privilege'
    );
  });
});