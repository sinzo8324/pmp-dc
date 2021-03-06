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
const { soliditySha3 } = require('web3-utils');
require('chai').should();

const AccessControlFacet = artifacts.require('AccessControlFacet');
const DiamondCutFacet = artifacts.require('DiamondCutFacet');
const DiamondLoupeFacet = artifacts.require('DiamondLoupeFacet');
const Erc20Facet = artifacts.require('Erc20Facet');
const PausableFacet = artifacts.require('PausableFacet');
const DCInterface = artifacts.require('IDCContract');
const Diamond = artifacts.require('Diamond');
const DCVault = artifacts.require('DCVault');

const testAccountPrivateKey = '0xFACDC25AB42FD449CA9CD505AAE912BBFF3F5B1880F70B3F63E1C733128032A7';
const testAccount = web3.eth.accounts.privateKeyToAccount(testAccountPrivateKey).address;
const chainId = '8888';
const version = '1';

const PERMIT_TYPEHASH = keccak256(
    toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
);
const TYPE_MINTER = soliditySha3('TYPE_MINTER');
const TYPE_BURNER = soliditySha3('TYPE_BURNER');
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

function generateRequestID(contractAddress, account, amount, count) {
    return soliditySha3(contractAddress, account, amount, count);
}

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

contract('DCVault', accounts => {
    before(async () => {
        this.accessControlFacet = await AccessControlFacet.new({ from: accounts[0] });
        this.diamondCutFacet = await DiamondCutFacet.new({ from: accounts[0] });
        this.diamondLoupeFacet = await DiamondLoupeFacet.new({ from: accounts[0] });
        this.erc20Facet = await Erc20Facet.new({ from: accounts[0] });
        this.pausableFacet = await PausableFacet.new({ from: accounts[0] });
        this.dcVault = await DCVault.new({ from: accounts[0] });

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

        await this.dcVault.setDCContract(this.erc20Token.address, { from: accounts[0] });
        await this.erc20Token.grantRole(TYPE_MINTER, accounts[0], { from: accounts[0] });
        await this.erc20Token.grantRole(TYPE_MINTER, this.dcVault.address, { from: accounts[0] });
        await this.erc20Token.grantRole(TYPE_BURNER, this.dcVault.address, { from: accounts[0] });
    });

    describe('setDCContract', async () => {
        it('Only the contract owner can use the function', async () => {
            await expectRevert(
                this.dcVault.setDCContract(constants.ZERO_ADDRESS, { from: accounts[1] }),
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
                this.dcVault.lockUpDC(accounts[1], '100', { from: accounts[0] }),
                'ERC20: transfer amount exceeds balance'
            );
        });
        it('user account should approve for DCVault Contract', async () => {
            for (let i = 1; i < 5; i++) {
                await this.erc20Token.issue(accounts[i], '10000', { from: accounts[0] });
            }
            await expectRevert(
                this.dcVault.lockUpDC(accounts[1], '100', { from: accounts[0] }),
                'ERC20: transfer amount exceeds allowance'
            );
        });
        it('DCLocked event should be emitted', async () => {
            for (let i = 1; i < 5; i++) {
                await this.erc20Token.approve(this.dcVault.address, '10000', { from: accounts[i] });
                const receipt = await this.dcVault.lockUpDC(accounts[i], '100', { from: accounts[0] });
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
            for (let i = 0; i < 4; i++) {
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
                this.dcVault.addTxHash(requestIDList, [constants.ZERO_BYTES32], { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('length of input arrays should be same with each others', async () => {
            let requestIDList = [];
            let txHashList = [];
            for (let i = 0; i < 4; i++) {
                requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
                txHashList.push(soliditySha3(i));
            }
            txHashList.push(soliditySha3(5));
            await expectRevert(
                this.dcVault.addTxHash(requestIDList, txHashList, { from: accounts[0] }),
                'length of input arrays should be same with each others'
            );
        });
        it('the input array length can not be bigger than length of request list on contract', async () => {
            let requestIDList = [];
            let txHashList = [];
            for (let i = 0; i < 6; i++) {
                requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
                txHashList.push(soliditySha3(i));
            }
            await expectRevert(
                this.dcVault.addTxHash(requestIDList, txHashList, { from: accounts[0] }),
                'length of input array cannot be bigger than pending list on the contract'
            );
        });
        it('Finished event should be emitted', async () => {
            let requestIDList = [];
            let txHashList = [];
            for (let i = 0; i < 3; i++) {
                requestIDList.push(generateRequestID(this.dcVault.address, accounts[1 + i], '100', i));
                txHashList.push(soliditySha3(i));
            }
            const receipt = await this.dcVault.addTxHash(requestIDList, txHashList, { from: accounts[0] });
            for (let i = 0; i < requestIDList.length; i++) {
                assert.equal(receipt.logs[i].event, 'Finished');
                assert.equal(receipt.logs[i].args.requestID, requestIDList[i]);
                assert.equal(receipt.logs[i].args.source, accounts[i + 1]);
                assert.equal(receipt.logs[i].args.amount, '100');
            }
        });
        it('the remain requests should be stored in contracts', async () => {
            let result = await this.dcVault.getPendingList();
            const requestID = generateRequestID(this.dcVault.address, accounts[4], '100', 3);

            assert.equal(result[0][0], requestID);
            assert.equal(result[1][0], accounts[4]);
            assert.equal(result[2][0].toString(), '100');

            await this.dcVault.lockUpDC(accounts[2], '100', { from: accounts[0] });
            await this.dcVault.lockUpDC(accounts[3], '100', { from: accounts[0] });

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
            const receipt = await this.dcVault.unlockDC(accounts[1], '100', { from: accounts[0] });
            expectEvent(receipt, 'DCUnlocked', {
                toAddress: accounts[1],
                amount: '100'
            });
            const balance2 = await this.erc20Token.balanceOf(accounts[1]);
            assert.equal(balance1.addn(100).toString(), balance2.toString())
        });
    });

    describe('mintDCnLockUp function', async () => {
        it('Only the contract owner can use the function', async () => {
            //permit
            const nonce = await this.erc20Token.nonces(testAccount);
            const current = await time.latest();
            const deadline = current.addn(1000);
            const digest = await getApprovalDigest(
                'Digital Currency', this.erc20Token.address, testAccount, this.dcVault.address, '1000', nonce.toString(), deadline.toString()
            );

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));
            await expectRevert(
                this.dcVault.mintDCnLockUp(testAccount, '1000', deadline, v, hexlify(r), hexlify(s), { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('check emitted events', async () => {
            //permit
            const nonce = await this.erc20Token.nonces(testAccount);
            const current = await time.latest();
            const deadline = current.addn(1000);
            const digest = await getApprovalDigest(
                'Digital Currency', this.erc20Token.address, testAccount, this.dcVault.address, '1000', nonce.toString(), deadline.toString()
            );

            const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), Buffer.from(testAccountPrivateKey.slice(2), 'hex'));
            const receipt = await this.dcVault.mintDCnLockUp(testAccount, '1000', deadline, v, hexlify(r), hexlify(s));
            expectEvent(receipt, 'DCLocked', {
                requestID: generateRequestID(this.dcVault.address, testAccount, '1000', 6),
                source: testAccount,
                amount: '1000'
            });
        });
    });

    describe('unlockDCnBurn function', async () => {
        it('Only the contract owner can use the function', async () => {
            await expectRevert(
                this.dcVault.unlockDCnBurn(accounts[1], '100', { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('check emitted events', async () => {
            const balance1 = await this.erc20Token.balanceOf(this.dcVault.address);
            const balance2 = await this.erc20Token.balanceOf(accounts[1]);
            const receipt = await this.dcVault.unlockDCnBurn(accounts[1], '100');
            expectEvent(receipt, 'DCUnlocked', {
                toAddress: accounts[1],
                amount: '100'
            });
            const balance3 = await this.erc20Token.balanceOf(this.dcVault.address);
            const balance4 = await this.erc20Token.balanceOf(accounts[1]);
            assert.equal(balance1.subn(100).toString(), balance3.toString())
            assert.equal(balance2.toString(), balance4.toString());
        });
    });

    describe('cancelRequest function', async () => {
        it('Only the contract owner can use the function', async () => {
            await expectRevert(
                this.dcVault.cancelRequest(constants.ZERO_BYTES32, { from: accounts[1] }),
                'Ownable: caller is not the owner'
            );
        });
        it('Cannot cancel request with invalid request ID', async () => {
            await expectRevert(
                this.dcVault.cancelRequest(constants.ZERO_BYTES32),
                'Invalid request ID'
            );
        });
        it('Request cannot be canceled during the guard time', async () => {
            const result = await this.dcVault.getPendingList();
            const requestIDList = result[0];
            const requestID = requestIDList[requestIDList.length - 1];
            await expectRevert(
                this.dcVault.cancelRequest(requestID),
                'Request cannot be canceled during the guard time'
            );
        });
        it('Unlock event should be emit', async () => {
            const result = await this.dcVault.getPendingList();
            let idx = result[0].length - 2;
            let requestID = result[0][idx];
            await time.increase(1805);
            let receipt = await this.dcVault.cancelRequest(requestID);
            expectEvent(receipt, 'DCUnlocked', {
                toAddress: result[1][idx],
                amount: result[2][idx]
            });
            idx = result[0].length - 1
            requestID = result[0][idx];
            receipt = await this.dcVault.cancelRequest(requestID);
            expectEvent(receipt, 'DCUnlocked', {
                toAddress: result[1][idx],
                amount: result[2][idx]
            });
        });
    });
    describe('Lock token by users', async () => {
        it('Cannot lock 0 token', async () => {
            await expectRevert(
                this.erc20Token.transfer(this.dcVault.address, '0', { from: accounts[1] }),
                'DCVault: Cannot receive 0 DC'
            );
        });
        it('DCLocked event should be emitted after DCVault receives tokens successfully', async () => {
            const receipt = await this.erc20Token.transfer(this.dcVault.address, '100', { from: accounts[1] });
            const pastEvent = await this.dcVault.getPastEvents('DCLocked', {fromBlock: receipt.receipt.blockNumber, toBlock: receipt.receipt.blockNumber});
            assert.equal(pastEvent[0].event, 'DCLocked');
            assert.equal(pastEvent[0].args.requestID, generateRequestID(this.dcVault.address, accounts[1], '100', 7));
            assert.equal(pastEvent[0].args.source, accounts[1]);
            assert.equal(pastEvent[0].args.amount.toString(), '100');
        });
    });
});
