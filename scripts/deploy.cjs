const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Deploying EWA to PUSH Chain...');

 // 1️⃣ Deploy MockERC20
const MockTokenFactory = await hre.ethers.getContractFactory("MockERC20");
const mockToken = await MockTokenFactory.deploy(
    "Mock WRC20",   // token name
    "MWRC",         // token symbol
    ethers.parseUnits("1000000", 18) // initial supply: 1,000,000 tokens
);
await mockToken.waitForDeployment();
console.log("MockERC20 deployed at:", mockToken.getAddress());




  
// get factory address
const EWAFactory = await hre.ethers.getContractFactory("EWA");




//   const tokenAddress = "0xYourTokenAddressHere";
  const EWA = await EWAFactory.deploy( mockToken.getAddress());
  await EWA.waitForDeployment();

  const address = await EWA.getAddress();
  console.log(`EWA deployed to: ${address}`);




  // Save deployed details
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentData = {
    contract: "EWA",
    address,
    network: hre.network.name,
    abi: require("../artifacts/contracts/EWA.sol/EWA.json").abi,
  };

  fs.writeFileSync(
    path.join(deploymentsDir, "EWA.json"),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("📂 Deployment info saved to deployments/EWA.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});