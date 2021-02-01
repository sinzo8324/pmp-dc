const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

const TYPE_MINTER = '0xa8791d3acb7f4f152c41f3308e90b16e68a23666347d9c4c5ce8535dffead10d';
const TYPE_BURNER = '0x9a433df5d818859975655002918d19fe2ba4567432e52f0cec8426ddf4dc2ada';
const VERSION = '1';

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

async function main() {
    try {
        const input = argvParser(process.argv);
        const web3 = new Web3(new Web3.providers.HttpProvider(input.nodeAddr));
        const account = await web3.eth.accounts.privateKeyToAccount(input.privateKey);
        await web3.eth.accounts.wallet.add(account);
        const source = fs.readFileSync(path.join(__dirname, './accountInfo.json'));
        const accountInfo = JSON.parse(source);
        const erc20Logic = await deploy('Erc20Logic', null, web3, account.address);
        const primaryStorage = await deploy('PrimaryStorage', null, web3, account.address);
        const erc20Storage = await deploy('Erc20Storage', null, web3, account.address);
        const proxy = await deploy('Proxy', [primaryStorage._address], web3, account.address);
        const dcVault = await deploy('DCVault', null, web3, account.address);

        await sendTransaction(web3, primaryStorage.methods.transferOwnership(proxy._address), account.address);
        await sendTransaction(web3, erc20Storage.methods.updateTokenDetails('Digital Currency', 'WON', '0'), account.address);
        await sendTransaction(web3, erc20Storage.methods.transferOwnership(proxy._address), account.address);
        await sendTransaction(web3, proxy.methods.addAdditionalStorage(erc20Storage._address), account.address);
        await sendTransaction(web3, proxy.methods.updateLogicContract(erc20Logic._address, VERSION), account.address);
        await sendTransaction(web3, proxy.methods.addRoleType(TYPE_MINTER), account.address);
        await sendTransaction(web3, proxy.methods.addRoleType(TYPE_BURNER), account.address);
        await sendTransaction(web3, proxy.methods.grantRole(TYPE_MINTER, accountInfo.Minter), account.address);
        await sendTransaction(web3, proxy.methods.grantRole(TYPE_MINTER, dcVault._address), account.address);
        await sendTransaction(web3, proxy.methods.grantRole(TYPE_BURNER, accountInfo.Burner), account.address);
        await sendTransaction(web3, proxy.methods.grantRole(TYPE_BURNER, dcVault._address), account.address);
        await sendTransaction(web3, dcVault.methods.setDCContractAddress(proxy._address), account.address);

        const deployResult = {
            Proxy: proxy._address,
            PrimaryStorage: primaryStorage._address,
            Erc20Logic: erc20Logic._address,
            Erc20Storage: erc20Storage._address,
            DCVault: dcVault._address
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
