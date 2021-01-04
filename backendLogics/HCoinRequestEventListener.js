const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const Web3 = require('web3');

const myEnv = dotenv.config({ path: path.join(__dirname, '../.env') });
dotenvExpand(myEnv);

const web3 = new Web3(process.env.LOCALWS);

const Caver = require('caver-js');
const caver = new Caver(process.env.GXTESTNETWS);

const HCoinContractManager = require('./utils/HL_ContractManager');
const HPointContractManager = require('./utils/GX_ContractManager');

const hl_ContractManager = new HCoinContractManager();
const gx_ContractManager = new HPointContractManager();

let addr = gx_ContractManager.getContractAddress('HPointToCoin');
const source = fs.readFileSync(path.join(__dirname, "../build/contracts/HPointToCoin.json"));
const contractInfo = JSON.parse(source);
const HPointToCoinContract = new caver.klay.Contract(contractInfo.abi, addr);

class HCoinRequestEventListener {
    async setEventWatch() {
        HPointToCoinContract.events.RequestRecorded().on('data', async (evt) => {
            const fromAddr = evt.returnValues.requester;
            const receiverAddr = evt.returnValues.toAddrOnCoin;
            const amount = evt.returnValues.amount;
            console.log(fromAddr, receiverAddr, amount);
            try {
                const txHash = await hl_ContractManager.requestEmitCoin(receiverAddr, amount);
                await gx_ContractManager.writeTxHash(fromAddr, receiverAddr, amount, txHash);
            } catch (err) {
                // Todo add logger
                console.log(err);
            }
        }).on('error', console.error);
    }
}

module.exports = HCoinRequestEventListener;
