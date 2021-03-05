const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

const TYPE_MINTER = '0xa8791d3acb7f4f152c41f3308e90b16e68a23666347d9c4c5ce8535dffead10d';
const TYPE_BURNER = '0x9a433df5d818859975655002918d19fe2ba4567432e52f0cec8426ddf4dc2ada';
const VERSION = '1';
const LimitPerAccount = '2000000';
const FacetCutAction = {
    Add: 0,
    Replace: 1,
    Remove: 2
}

async function deploy(contractName, input, web3, address) {
    try {
        const source = fs.readFileSync(path.join(__dirname, './build/contracts/'+contractName+'.json'));
        const contract = JSON.parse(source);
        const contractToDeploy = new web3.eth.Contract(contract.abi);
        const nonce = await web3.eth.getTransactionCount(address);
        let gas;
        let result;
        if(input !== null) {
            gas = await contractToDeploy.deploy({data: contract.bytecode, arguments: input}).estimateGas({from: address});
            result = await contractToDeploy.deploy({data: contract.bytecode, arguments: input}).send({from: address, gas: gas, nonce: nonce});
        } else {
            gas = await contractToDeploy.deploy({data: contract.bytecode}).estimateGas({from: address});
            result = await contractToDeploy.deploy({data: contract.bytecode}).send({from: address, gas: gas, nonce: nonce});
        }
        return new web3.eth.Contract(contract.abi, result.options.address);
    } catch(err) {
        console.log(err);
    }
}

async function sendTransaction(web3, tx, address) {
    const nonce = await web3.eth.getTransactionCount(address);
    const gas = await tx.estimateGas({from: address});
    await tx.send({from: address, gas: gas, nonce: nonce});
}

function argvParser(processArgv){
    let obj = {};
    if(processArgv.length !== 4){
        throw new Error('Number of parameters should be 2 - NodeAddress(http://) privateKey(Hex)');
    }
    obj.nodeAddr = processArgv[2];
    obj.privateKey = processArgv[3];
    return obj;
}

function getSelectors (contract) {
    const selectors = contract._jsonInterface.reduce((acc, val) => {
        if (val.type === 'function') {
            acc.push(val.signature);
            return acc;
        } else {
            return acc;
        }
    }, []);
    return selectors;
}

async function main() {
    try {
        const input = argvParser(process.argv);
        const web3 = new Web3(new Web3.providers.HttpProvider(input.nodeAddr));
        const account = await web3.eth.accounts.privateKeyToAccount(input.privateKey);
        await web3.eth.accounts.wallet.add(account);
        const source = fs.readFileSync(path.join(__dirname, './accountInfo.json'));
        const accountInfo = JSON.parse(source);

        const accessControlFacet = await deploy('AccessControlFacet', null, web3, account.address);
        const diamondCutFacet = await deploy('DiamondCutFacet', null, web3, account.address);
        const diamondLoupeFacet = await deploy('DiamondLoupeFacet', null, web3, account.address);
        const erc20Facet = await deploy('Erc20Facet', null, web3, account.address);
        const pausableFacet = await deploy('PausableFacet', null, web3, account.address);
        const diamondCut = [
            [diamondCutFacet._address, FacetCutAction.Add, getSelectors(diamondCutFacet)],
            [diamondLoupeFacet._address, FacetCutAction.Add, getSelectors(diamondLoupeFacet)],
            [accessControlFacet._address, FacetCutAction.Add, getSelectors(accessControlFacet)],
            [erc20Facet._address, FacetCutAction.Add, getSelectors(erc20Facet)],
            [pausableFacet._address, FacetCutAction.Add, getSelectors(pausableFacet)],
        ];
        const diamond = await deploy('Diamond', [diamondCut], web3, account.address);

        const dcVault = await deploy('DCVault', null, web3, account.address);
        const dcWallet = await deploy('DCWallet', null, web3, account.address);
        const dcLender = await deploy('DCLender', null, web3, account.address);

        const dcTokenJson = fs.readFileSync(path.join(__dirname, './build/contracts/IDCContract.json'));
        const interface = JSON.parse(dcTokenJson);
        const dcToken = new web3.eth.Contract(interface.abi, diamond._address);

        await sendTransaction(web3, dcToken.methods.updateTokenDetails('Digital Currency', 'WON', '0'), account.address);
        await sendTransaction(web3, dcToken.methods.setVersion(VERSION), account.address);
        await sendTransaction(web3, dcToken.methods.addRoleType(TYPE_MINTER), account.address);
        await sendTransaction(web3, dcToken.methods.addRoleType(TYPE_BURNER), account.address);
        await sendTransaction(web3, dcToken.methods.grantRole(TYPE_MINTER, accountInfo.Minter), account.address);
        await sendTransaction(web3, dcToken.methods.grantRole(TYPE_MINTER, dcVault._address), account.address);
        await sendTransaction(web3, dcToken.methods.grantRole(TYPE_BURNER, accountInfo.Burner), account.address);
        await sendTransaction(web3, dcToken.methods.grantRole(TYPE_BURNER, dcVault._address), account.address);
        await sendTransaction(web3, dcVault.methods.setDCContractAddress(dcToken._address), account.address);
        await sendTransaction(web3, dcLender.methods.setLoanLimit(LimitPerAccount), account.address);
        await sendTransaction(web3, dcLender.methods.setDCContract(dcToken._address), account.address);
        await sendTransaction(web3, dcWallet.methods.setDCContract(dcToken._address), account.address);
        await sendTransaction(web3, dcWallet.methods.setDCLenderContract(dcLender._address), account.address);
        await sendTransaction(web3, dcWallet.methods.transferOwnership(accountInfo.WalletOwner), account.address);

        const deployResult = {
            AccessControlFacet: accessControlFacet._address,
            DiamondCutFacet: diamondCutFacet._address,
            DiamondLoupeFacet: diamondLoupeFacet._address,
            Erc20Facet: erc20Facet._address,
            PausableFacet: pausableFacet._address,
            Diamond: diamond._address,
            DCVault: dcVault._address,
            DCLender: dcLender._address,
            DCWallet: dcWallet._address
        }

        const json = JSON.stringify(deployResult, null, 4);
        if(fs.existsSync(path.join(__dirname, './contract_list.json'))){
            fs.unlinkSync(path.join(__dirname, './contract_list.json'));
        }
        fs.writeFileSync(path.join(__dirname, './contract_list.json'), json);
        process.exit();
    } catch (err) {
        console.log(err);
    }
}

main();
