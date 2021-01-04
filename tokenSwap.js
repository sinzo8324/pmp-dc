const HCoinContractManager = require('./backendLogics/utils/HL_ContractManager');
const HPointContractManager = require('./backendLogics/utils/GX_ContractManager');

const hl_ContractManager = new HCoinContractManager();
const gx_ContractManager = new HPointContractManager();
const pollingInterval = 10000;

async function pollingPendingReqOnHL() {
    const pendingList = await hl_ContractManager.getPendingList();
    let from = [];
    let to = [];
    let amount = [];
    if(pendingList[0].length != 0) {
        for(let i = 0; i < pendingList[0].length; i++){
            from.push(pendingList[0][i]);
            to.push(pendingList[1][i]);
            amount.push(pendingList[2][i]);
        }
        console.log(pendingList);
        const txHash = await gx_ContractManager.requestMint(to, amount);
        await hl_ContractManager.writeTxHash(from, to, amount, txHash);
    }

}

async function pollingPendingReqOnGX() {
    const pendingList = await gx_ContractManager.getPendingList();
    let from = [];
    let to = [];
    let amount = [];
    if(pendingList[0].length != 0) {
        for(let i = 0; i < pendingList[0].length; i++){
            from.push(pendingList[0][i]);
            to.push(pendingList[1][i]);
            amount.push(pendingList[2][i]);
        }
        console.log(pendingList);
        const txHash = await hl_ContractManager.requestEmitCoin(to, amount);
        await gx_ContractManager.writeTxHash(from, to, amount, txHash);        
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    setInterval(pollingPendingReqOnHL, pollingInterval);
    await sleep(pollingInterval/2);
    setInterval(pollingPendingReqOnGX, pollingInterval);
}

main();
