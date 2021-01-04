const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const myEnv = dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenvExpand(myEnv);

const Caver = require('caver-js');
const caver = new Caver(process.env.GXTESTNET);

const privateKey = fs.readFileSync(path.join(__dirname, '../../.gxSecret')).toString();
const keyringFromPrivateKey = caver.wallet.keyring.createFromPrivateKey(privateKey);
caver.wallet.add(keyringFromPrivateKey);

const account = keyringFromPrivateKey._address;

class GX_ContractManager {
    async deploy(contractName) {
        try {
            const source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
            const contract = JSON.parse(source);
            const contractToDeploy = new caver.contract(contract.abi);
            const gas = await contractToDeploy.deploy({data: contract.bytecode}).estimateGas();
            const nonce = await caver.rpc.klay.getTransactionCount(account);
            const result = await contractToDeploy.deploy({data: contract.bytecode}).send({from: account, gas: gas * 10, value: 0, nonce: nonce});
            return new caver.contract(contract.abi, result.options.address);
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }

    async getPendingList() {
        const addr = this.getContractAddress('HPointToCoin');
        const contract = this.getContract(addr, 'HPointToCoin');
        const list = await contract.methods.getPendingList().call();
        return list;
    }

    async requestMint(receiverAddr, amount) {
        try{
            const addr = this.getContractAddress('Proxy');
            const contract = this.getContract(addr, 'KIP7Logic');
            const nonce = await caver.rpc.klay.getTransactionCount(account);
            const result = await contract.methods.mintMultiple(receiverAddr, amount).send({from: account, gas: 100000000, nonce: nonce});
            return result.transactionHash;
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }

    async writeTxHash(fromAddr, receiverAddr, amount, txHash) {
        try {
            const addr = this.getContractAddress('HPointToCoin');
            const contract = this.getContract(addr, 'HPointToCoin');
            const nonce = await caver.rpc.klay.getTransactionCount(account);
            await contract.methods.addTxHash(fromAddr, receiverAddr, amount, txHash).send({from: account, gas: 100000000, nonce: nonce});
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }

    getContract(contractAddr, contractName) {
        const source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
        const contract = JSON.parse(source);
        const instance = new caver.contract(contract.abi, contractAddr);
        return instance;
    }

    getContractAddress(name) {
        const source = fs.readFileSync(path.join(__dirname, './GX_contractAddr.json'));
        const addrList = JSON.parse(source);
        return addrList[name];
    }

    async deployAndSetAll() {
        try {
            const proxy = await this.deploy('Proxy');
            const kip7Logic = await this.deploy('KIP7Logic');
            const dataStorage = await this.deploy('DataStorage');
            const rolesStorage = await this.deploy('RolesStorage');
            const hPointToCoin = await this.deploy('HPointToCoin');

            const data = {
                Proxy: proxy._address,
                KIP7Logic: kip7Logic._address,
                DataStorage: dataStorage._address,
                RolesStorage: rolesStorage._address,
                HPointToCoin: hPointToCoin._address,
            }

            const json = JSON.stringify(data, null, 4);
            if(fs.existsSync(path.join(__dirname, './GX_contractAddr.json'))){
                fs.unlinkSync(path.join(__dirname, './GX_contractAddr.json'));
            }
            fs.writeFileSync(path.join(__dirname, './GX_contractAddr.json'), json);

            const gas = 100000000;
            const nonce = await caver.rpc.klay.getTransactionCount(account);
            await dataStorage.methods.updateTokenDetails('HPoint', 'HP', '0').send({from: account, gas: gas, nonce: nonce});
            await dataStorage.methods.transferOwnership(data.Proxy).send({from: account, gas: gas});
            await rolesStorage.methods.addAccount(data.HPointToCoin).send({from: account, gas: gas});
            await rolesStorage.methods.transferOwnership(data.Proxy).send({from: account, gas: gas});
            await proxy.methods.addDataStorage(data.DataStorage).send({from: account, gas: gas});
            await proxy.methods.addDataStorage(data.RolesStorage).send({from: account, gas: gas});
            await proxy.methods.updateLogicContract(data.KIP7Logic).send({from: account, gas: gas});
            await hPointToCoin.methods.setHPoint(data.Proxy).send({from: account, gas: gas});
        } catch (err) {
            // Todo add logger
            console.log(err);
        }
    }
}

module.exports = GX_ContractManager;
