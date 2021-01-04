const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');

const myEnv = dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenvExpand(myEnv);

const mnemonic = fs.readFileSync(path.join(__dirname, '../../.secret')).toString();
const provider = new HDWalletProvider(mnemonic, process.env.LOCAL);
const web3 = new Web3(provider);

class HL_ContractManager {
    async deploy(contractName) {
        try {
            const source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
            const contract = JSON.parse(source);
            const contractToDeploy = new web3.eth.Contract(contract.abi);
            const nonce = await web3.eth.getTransactionCount(provider.addresses[0]);
            const result = await contractToDeploy.deploy({data: contract.bytecode}).send({from: provider.addresses[0], nonce: nonce});
            return new web3.eth.Contract(contract.abi, result.options.address);
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }

    async getPendingList() {
        const addr = this.getContractAddress('CoinToHPoint');
        const contract = this.getContract(addr, 'CoinToHPoint');
        const list = await contract.methods.getPendingList().call();
        return list;
    }

    async writeTxHash(fromAddr, receiverAddr, amount, txHash) {
        try {
            const addr = this.getContractAddress('CoinToHPoint');
            const contract = this.getContract(addr, 'CoinToHPoint');
            const nonce = await web3.eth.getTransactionCount(provider.addresses[0]);
            await contract.methods.addTxHash(fromAddr, receiverAddr, amount, txHash).send({from: provider.addresses[0], nonce: nonce});
        } catch (err) {
            // Todo Add logger
            console.log(err);
        }
    }

    async requestEmitCoin(receiverAddr, amount) {
        try {
            const addr = this.getContractAddress('CoinToHPoint');
            const contract = this.getContract(addr, 'CoinToHPoint');
            const nonce = await web3.eth.getTransactionCount(provider.addresses[0]);
            const result = await contract.methods.emitErc20Token(receiverAddr, amount).send({from: provider.addresses[0], nonce: nonce});
            return result.transactionHash;
        } catch (err) {
            // Todo Add logger
            console.log(err);
        }
    }

    getContract(contractAddr, contractName) {
        const source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
        const contract = JSON.parse(source);
        const instance = new web3.eth.Contract(contract.abi, contractAddr);
        return instance;
    }

    getContractAddress(name) {
        const source = fs.readFileSync(path.join(__dirname, './HL_contractAddr.json'));
        const addrList = JSON.parse(source);
        return addrList[name];
    }

    async deployAndSetAll() {
        try {
            const proxy = await this.deploy('Proxy');
            const erc20Logic = await this.deploy('Erc20Logic');
            const dataStorage = await this.deploy('DataStorage');
            const coinToHPoint = await this.deploy('CoinToHPoint');

            const data = {
                Proxy: proxy._address,
                Erc20Logic: erc20Logic._address,
                DataStorage: dataStorage._address,
                CoinToHPoint: coinToHPoint._address,
            }
            const json = JSON.stringify(data, null, 4);
            if(fs.existsSync(path.join(__dirname, './HL_contractAddr.json'))){
                fs.unlinkSync(path.join(__dirname, './HL_contractAddr.json'));
            }
            fs.writeFileSync(path.join(__dirname, './HL_contractAddr.json'), json);

            const nonce = await web3.eth.getTransactionCount(provider.addresses[0]);
            await dataStorage.methods.updateTokenDetails('HanwhaCoin', 'WON', '0').send({from: provider.addresses[0], nonce: nonce});
            await dataStorage.methods.transferOwnership(data.Proxy).send({from: provider.addresses[0]});
            await proxy.methods.addDataStorage(data.DataStorage).send({from: provider.addresses[0]});
            await proxy.methods.updateLogicContract(data.Erc20Logic).send({from: provider.addresses[0]});
            await coinToHPoint.methods.setCoin(data.Proxy).send({from: provider.addresses[0]});
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }
}

module.exports = HL_ContractManager;
