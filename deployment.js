const HCoinContractManager = require('./backendLogics/utils/HL_ContractManager');
const HPointContractManager = require('./backendLogics/utils/GX_ContractManager');

async function main() {
  const hl_ContractManager = new HCoinContractManager();
  await hl_ContractManager.deployAndSetAll();
  const gx_ContractManager = new HPointContractManager();
  await gx_ContractManager.deployAndSetAll();
  
  process.exit();

}

main();
