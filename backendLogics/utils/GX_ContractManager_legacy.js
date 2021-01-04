const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const Caver = require('caver-js');
const caver = new Caver(process.env.GXTESTNET);
const privateKey = fs.readFileSync(path.join(__dirname, '../../.gxSecret')).toString();
const account = caver.klay.accounts.wallet.add(privateKey);
const myEnv = dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenvExpand(myEnv);


class GX_ContractManager_legacy {

    async sendDeploy(tx) {
        try {
            const from = account.address;
            const nonce = await caver.rpc.klay.getTransactionCount(from);
            const data = tx.encodeABI();
            const gasLimit = await tx.estimateGas({from});

            const rawTx =  {
                from: from,
                nonce,
                gasLimit,
                value: '0x00',
                data
            }

            let receipt = await caver.klay.sendTransaction(rawTx);
            return receipt;
        } catch (err) {
            throw err;
        }
    }

    async sendMethod(method, targetAddr) {
        try {
            const from = account.address;
            const nonce = await caver.rpc.klay.getTransactionCount(from);
            const data = method.encodeABI();
            const gasLimit = await method.estimateGas({ from });
        
            const rawTx = {
                from: from,
                nonce,
                gasLimit,
                to: targetAddr,
                value: '0x00',
                data
            }

            let receipt = await caver.klay.sendTransaction(rawTx);
            return receipt;
        } catch (err) {
            throw err;
        }
    }

    async deploy(contractName) {
        let source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
        let contract = JSON.parse(source);
      
        let contractToDeploy = new caver.contract(contract.abi);
        let deployTx = contractToDeploy.deploy({data: contract.bytecode});
        const result = await this.sendDeploy(deployTx);
        return new caver.contract(contract.abi, result.contractAddress);
    }

    getContract(contractAddr, contractName) {
        let source = fs.readFileSync(path.join(__dirname, "../../build/contracts/"+contractName+".json"));
        let contract = JSON.parse(source);
        let instance = new caver.contract(contract.abi, contractAddr);
        return instance;
    }

    getContractAddress(name) {
        const source = fs.readFileSync(path.join(__dirname, './GX_contractAddr.json'));
        const addrList = JSON.parse(source);
        return addrList[name];
    }

    async deployAndSetAll() {
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


        let contractIns = this.getContract(data.DataStorage, 'DataStorage');
        let method = contractIns.methods.updateTokenDetails('HanwhaPoint', 'HP', '0');
        await this.sendMethod(method, data.DataStorage);

        method = contractIns.methods.transferOwnership(data.Proxy);
        await this.sendMethod(method, data.DataStorage);

        contractIns = this.getContract(data.RolesStorage, 'RolesStorage');
        method = contractIns.methods.transferOwnership(data.Proxy);
        await this.sendMethod(method, data.RolesStorage);
    
        contractIns = this.getContract(data.Proxy, 'Proxy');
        method = contractIns.methods.addDataStorage(data.DataStorage);
        await this.sendMethod(method, data.Proxy);

        method = contractIns.methods.addDataStorage(data.RolesStorage);
        await this.sendMethod(method, data.Proxy);
    
        method = contractIns.methods.updateLogicContract(data.KIP7Logic);
        await this.sendMethod(method, data.Proxy);
    }
}

module.exports = GX_ContractManager_legacy;
