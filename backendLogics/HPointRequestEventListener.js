const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const path = require('path');
const Web3 = require('web3');

const myEnv = dotenv.config({ path: path.join(__dirname, '../.env') });
dotenvExpand(myEnv);

const web3 = new Web3(process.env.LOCALWS);

const HCoinContractManager = require('./utils/HL_ContractManager');
const HPointContractManager = require('./utils/GX_ContractManager');

const hl_ContractManager =  new HCoinContractManager();
const gx_ContractManager = new HPointContractManager();

let addr = hl_ContractManager.getContractAddress('CoinToHPoint');
const source = fs.readFileSync(path.join(__dirname, "../build/contracts/CoinToHPoint.json"));
const contractInfo = JSON.parse(source);
const CoinToHPointContract = new web3.eth.Contract(contractInfo.abi, addr);

class HPointRequestEventListener {
    async setEventWatch() {
        CoinToHPointContract.events.RequestRecorded(async (err, result) => {
            if(err) {
                // Todo add logger
                console.log(err);
            } else {
                const fromAddr = result.returnValues.requester;
                const receiverAddr = result.returnValues.toAddrOnKlaytn;
                const amount = result.returnValues.amount;
                console.log(fromAddr, receiverAddr, amount);

                try {
                    const txHash = await gx_ContractManager.requestMint(receiverAddr, amount);
                    await hl_ContractManager.writeTxHash(fromAddr, receiverAddr, amount, txHash);
                } catch (err) {
                    // Todo add logger
                    console.log(err);
                }
            }
        });
    }
}

module.exports = HPointRequestEventListener;
