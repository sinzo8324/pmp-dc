const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

async function deploy(contractName, web3, address) {
    try {
        const source = fs.readFileSync(path.join(__dirname, './build/contracts/'+contractName+'.json'));
        const contract = JSON.parse(source);
        const contractToDeploy = new web3.eth.Contract(contract.abi);
        const nonce = await web3.eth.getTransactionCount(address);
        const gas = await contractToDeploy.deploy({data: contract.bytecode}).estimateGas({from: address});
        const result = await contractToDeploy.deploy({data: contract.bytecode}).send({from: address, gas: gas, nonce: nonce});
        return new web3.eth.Contract(contract.abi, result.options.address);
    } catch(err) {
        console.log(err);
    }
}

async function deployWithLibrary(libName, contractName, web3, address) {
    try {
        const library = await deploy(libName, web3, address);

        const source = fs.readFileSync(path.join(__dirname, './build/contracts/'+contractName+'.json'));
        const contract = JSON.parse(source);
        const contractToDeploy = new web3.eth.Contract(contract.abi);
        const linkedByteCode = contract.bytecode.split('__' + libName + '________________________').join(library._address.replace('0x', ''))
        const nonce = await web3.eth.getTransactionCount(address);
        const gas = await contractToDeploy.deploy({data: linkedByteCode}).estimateGas({from: address});
        const result = await contractToDeploy.deploy({data: linkedByteCode}).send({from: address, gas: gas, nonce: nonce});
        return new web3.eth.Contract(contract.abi, result.options.address);
    } catch (err) {
        // Todo add logger
        console.log(err);
    }
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
        const proxy = await deploy('Proxy', web3, account.address);
        const erc20Logic = await deploy('Erc20Logic', web3, account.address);
        const dataStorage = await deploy('DataStorage', web3, account.address);
        const coinToHPoint = await deployWithLibrary('RequestListLib', 'CoinToHPoint', web3, account.address);

        const nonce = await web3.eth.getTransactionCount(account.address);

        let gas = await dataStorage.methods.updateTokenDetails('Digital Currency', 'WON', '0').estimateGas({from: account.address});
        await dataStorage.methods.updateTokenDetails('Digital Currency', 'WON', '0').send({from: account.address, gas: gas, nonce: nonce});

        gas = await dataStorage.methods.transferOwnership(proxy._address).estimateGas({from: account.address});
        await dataStorage.methods.transferOwnership(proxy._address).send({from: account.address, gas: gas});

        gas = await proxy.methods.addDataStorage(dataStorage._address).estimateGas({from: account.address});
        await proxy.methods.addDataStorage(dataStorage._address).send({from: account.address, gas: gas});

        gas = await proxy.methods.updateLogicContract(erc20Logic._address).estimateGas({from: account.address});
        await proxy.methods.updateLogicContract(erc20Logic._address).send({from: account.address, gas: gas});

        gas = await proxy.methods.setInitialize(accountInfo.Compliance, accountInfo.Minter, accountInfo.Burner, accountInfo.Operator).estimateGas({from: account.address});
        await proxy.methods.setInitialize(accountInfo.Compliance, accountInfo.Minter, accountInfo.Burner, accountInfo.Operator).send({from: account.address, gas: gas});

        gas = await coinToHPoint.methods.setCoin(proxy._address).estimateGas({from:account.address});
        await coinToHPoint.methods.setCoin(proxy._address).send({from:account.address, gas: gas});

        gas = await coinToHPoint.methods.transferOwnership(accountInfo.Operator).estimateGas({from:account.address});
        await coinToHPoint.methods.transferOwnership(accountInfo.Operator).send({from: account.address, gas: gas});

        const deployResult = {
            Proxy: proxy._address,
            Erc20Logic: erc20Logic._address,
            DataStorage: dataStorage._address,
            CoinToHPoint: coinToHPoint._address
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
