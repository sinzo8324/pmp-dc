const {
    time,
    constants,
    expectEvent,
    expectRevert
} = require('@openzeppelin/test-helpers');
const {
    keccak256,
    hexlify,
    defaultAbiCoder,
    toUtf8Bytes,
    solidityPack
} = require('ethers/utils');
const { ecsign } = require('ethereumjs-util');
require('chai').should();

const Proxy = artifacts.require('Proxy');
const Erc20Logic = artifacts.require('Erc20Logic');
const LogicUpgradeTest = artifacts.require('LogicUpgradeTest');

const testAccountPrivateKey = '0xFACDC25AB42FD449CA9CD505AAE912BBFF3F5B1880F70B3F63E1C733128032A7';
const testAccount = web3.eth.accounts.privateKeyToAccount(testAccountPrivateKey).address;

const version = '1';
const versionTest = '2';
const chainId = '8888';
const PERMIT_TYPEHASH = keccak256(
    toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);
const TYPE_MINTER = keccak256(toUtf8Bytes('TYPE_MINTER'));
const TYPE_BURNER = keccak256(toUtf8Bytes('TYPE_BURNER'));

async function getDomainSeparator(name, tokenAddress) {
    return keccak256(
        defaultAbiCoder.encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
            [
                keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
                keccak256(toUtf8Bytes(name)),
                keccak256(toUtf8Bytes(version)),
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

async function getSize(instance) {
    const bytecode = instance.constructor._json.bytecode;
    const deployed = instance.constructor._json.deployedBytecode;
    const sizeOfB  = bytecode.length / 2;
    const sizeOfD  = deployed.length / 2;
    console.log("size of bytecode in bytes = ", sizeOfB);
    console.log("size of deployed in bytes = ", sizeOfD);
    console.log("initialization and constructor code in bytes = ", sizeOfB - sizeOfD);
}

contract('Digital Currency', async ([operator, minter, burner, ...accounts]) => {
    before(async () => {
        this.erc20Logic = await Erc20Logic.new({ from: operator });
        this.logicUpgradeTest = await LogicUpgradeTest.new({ from: operator });
        this.erc20Proxy = await Proxy.new({ from: operator });

        await this.erc20Proxy.updateTokenDetails('Digital Currency', 'WON', '0', { from: operator });
        await this.erc20Proxy.updateLogicContract(this.erc20Logic.address, version, { from: operator });
        await this.erc20Proxy.addRoleType(TYPE_MINTER, { from: operator });
        await this.erc20Proxy.addRoleType(TYPE_BURNER, { from: operator });
        await this.erc20Proxy.grantRole(TYPE_MINTER, minter, { from: operator });
        await this.erc20Proxy.grantRole(TYPE_BURNER, burner, { from: operator });

        this.erc20Token = await Erc20Logic.at(this.erc20Proxy.address);
        console.log('size of erc20Logic');
        await getSize(this.erc20Logic);
        console.log('size of LogicUpgradeTest');
        await getSize(this.logicUpgradeTest);
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
        it('Issue 1,000,000 tokens to account0', async () => {
            const receipt = await this.erc20Token.issue(accounts[0], 1000000, { from: minter });
            expectEvent(receipt, 'Transfer', {
                from: constants.ZERO_ADDRESS,
                to: accounts[0],
                value: '1000000',
            });
        });
    });

    describe('redeem function', async () => {
        it('Burn 100 tokens account0 owned', async () => {
            const receipt = await this.erc20Token.redeem(accounts[0], 100, { from: burner });
            expectEvent(receipt, 'Transfer', {
                from: accounts[0],
                to: constants.ZERO_ADDRESS,
                value: '100',
            });
        });
    });

    describe('transfer function', async () => {
        it('Account0 sends 1,000 tokens to account1', async () => {
            const receipt = await this.erc20Token.transfer(accounts[1], '1000', { from: accounts[0] });
            expectEvent(receipt, 'Transfer', {
                from: accounts[0],
                to: accounts[1],
                value: '1000',
            });
        });
    });

    describe('permit function', async () => {
        it('TestAccount set allowance for account0 by permit function ', async () => {
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
            await this.erc20Token.issue(testAccount, 1000, { from: minter });
        });
    });

    describe('Upgrade Logic', async () => {
        it('Upgrade Logic contract that has been removed EIP-2612 features', async () => {
            await this.erc20Proxy.updateLogicContract(this.logicUpgradeTest.address, versionTest, { from: operator });
        });
    });

    describe('Check data status', async () => {
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
        it('Balance check', async () => {
            let balance = await this.erc20Token.balanceOf(accounts[0]);
            assert.equal(balance, '998900');
            balance = await this.erc20Token.balanceOf(accounts[1]);
            assert.equal(balance, '1000');
            balance = await this.erc20Token.balanceOf(testAccount);
            assert.equal(balance, '1000');
        });
        it('Allowance check', async () => {
            const allowance = await this.erc20Token.allowance(testAccount, accounts[0]);
            assert.equal(allowance, '1000');
        });
        it('EIP 2612 related functions should make revert', async () => {
            await expectRevert(
                this.erc20Token.nonces(testAccount),
                'revert'
            );
            const nonce = '1';
            const current = await time.latest();
            const deadline = current.addn(1000);
            const digest = await getApprovalDigest(
                'Digital Currency', this.erc20Token.address, testAccount, accounts[0], '1000', nonce.toString(), deadline.toString()
            );

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));

            await expectRevert(
                this.erc20Token.permit(testAccount, accounts[0], '1000', deadline, v, hexlify(r), hexlify(s)),
                'revert'
                );
        });
    });
});
