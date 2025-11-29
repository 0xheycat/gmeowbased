const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🚀 DEPLOYING GMEOW PROXY ARCHITECTURE TO BASE SEPOLIA");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  console.log("📋 Deployment Info:");
  console.log("   Network:", network.name);
  console.log("   Chain ID:", network.chainId);
  console.log("   Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("   Balance:", hre.ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    console.error("❌ Deployer has no ETH! Get testnet ETH from:");
    console.error("   https://portal.cdp.coinbase.com/products/faucet\n");
    process.exit(1);
  }

  const deployments = {
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    implementations: {},
    proxy: ""
  };

  // Step 1: Deploy GmeowCore
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 1/4: Deploying GmeowCore...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const GmeowCore = await hre.ethers.getContractFactory("GmeowCore");
  const coreImpl = await GmeowCore.deploy();
  await coreImpl.waitForDeployment();
  const coreAddress = await coreImpl.getAddress();
  
  console.log("✅ GmeowCore deployed!");
  console.log("   Address:", coreAddress);
  console.log("   Tx hash:", coreImpl.deploymentTransaction().hash, "\n");
  
  deployments.implementations.core = coreAddress;

  // Step 2: Deploy GmeowGuild
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 2/4: Deploying GmeowGuild...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const GmeowGuild = await hre.ethers.getContractFactory("GmeowGuild");
  const guildImpl = await GmeowGuild.deploy();
  await guildImpl.waitForDeployment();
  const guildAddress = await guildImpl.getAddress();
  
  console.log("✅ GmeowGuild deployed!");
  console.log("   Address:", guildAddress);
  console.log("   Tx hash:", guildImpl.deploymentTransaction().hash, "\n");
  
  deployments.implementations.guild = guildAddress;

  // Step 3: Deploy GmeowNFTImpl
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 3/4: Deploying GmeowNFTImpl...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const GmeowNFTImpl = await hre.ethers.getContractFactory("GmeowNFTImpl");
  const nftImpl = await GmeowNFTImpl.deploy();
  await nftImpl.waitForDeployment();
  const nftAddress = await nftImpl.getAddress();
  
  console.log("✅ GmeowNFTImpl deployed!");
  console.log("   Address:", nftAddress);
  console.log("   Tx hash:", nftImpl.deploymentTransaction().hash, "\n");
  
  deployments.implementations.nft = nftAddress;

  // Step 4: Deploy GmeowProxy
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📦 Step 4/4: Deploying GmeowProxy...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  const GmeowProxy = await hre.ethers.getContractFactory("GmeowProxy");
  const proxy = await GmeowProxy.deploy(coreAddress, guildAddress, nftAddress);
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  
  console.log("✅ GmeowProxy deployed!");
  console.log("   Address:", proxyAddress);
  console.log("   Tx hash:", proxy.deploymentTransaction().hash, "\n");
  
  deployments.proxy = proxyAddress;

  // Step 5: Initialize via proxy
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔧 Step 5/5: Initializing contract...");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get oracle signer from environment or use deployer
  const oracleSigner = process.env.ORACLE_SIGNER || deployer.address;
  console.log("   Oracle Signer:", oracleSigner);

  // Attach GmeowCore ABI to proxy address
  const coreAtProxy = GmeowCore.attach(proxyAddress);
  
  console.log("\n   Calling initialize()...");
  const initTx = await coreAtProxy.initialize(oracleSigner);
  await initTx.wait();
  
  console.log("✅ Contract initialized!");
  console.log("   Tx hash:", initTx.hash, "\n");

  // Get badge contract address
  const badgeAddress = await coreAtProxy.badgeContract();
  deployments.badgeContract = badgeAddress;
  deployments.oracleSigner = oracleSigner;

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const filename = `${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deployments, null, 2));

  // Display summary
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  
  console.log("📋 Deployed Addresses:");
  console.log("   GmeowCore:     ", coreAddress);
  console.log("   GmeowGuild:    ", guildAddress);
  console.log("   GmeowNFTImpl:  ", nftAddress);
  console.log("   ⭐ GmeowProxy: ", proxyAddress);
  console.log("   Badge Contract:", badgeAddress);
  console.log("   Oracle Signer: ", oracleSigner);
  
  console.log("\n💾 Saved to:", filepath);

  console.log("\n🔍 Verify contracts on BaseScan:");
  console.log("   https://sepolia.basescan.org/address/" + proxyAddress);

  console.log("\n🧪 Quick Test (run these commands):");
  console.log("   npx hardhat console --network baseSepolia");
  console.log(`   const proxy = await ethers.getContractAt("GmeowCore", "${proxyAddress}")`);
  console.log("   await proxy.gmPointReward() // Should return: 50");
  console.log("   await proxy.OG_THRESHOLD() // Should return: 50000");

  console.log("\n⭐ Use this address in your frontend:");
  console.log("   " + proxyAddress);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
