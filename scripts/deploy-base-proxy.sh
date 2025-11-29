#!/bin/bash

# Deploy proxy to Base
echo "Deploying GmeowProxy to Base..."

# Contract addresses
CORE_ADDRESS="0x9BDD11aA50456572E3Ea5329fcDEb81974137f92"
GUILD_ADDRESS="0x967457be45facE07c22c0374dAfBeF7b2f7cd059"
NFT_ADDRESS="0xD99aeE13eA68C1e4e43cfA60E792520Dd06C2c20"

# Network settings
RPC_URL="https://base-mainnet.g.alchemy.com/v2/A6u4vxXFMPMk07zeChjbziq1Ch0Wcrjg"
PRIVATE_KEY="0x9abe1d6ae90d3fc0625d7a8dfc4866f4b08d606c20a5f6b4a0bbd62894c82e6b"
ORACLE_ADDRESS="0x8870C155666809609176260F2B65a626C000D773"

echo "Core: $CORE_ADDRESS"
echo "Guild: $GUILD_ADDRESS" 
echo "NFT: $NFT_ADDRESS"
echo "Oracle: $ORACLE_ADDRESS"
echo ""

# Deploy proxy
echo "Deploying proxy..."
PROXY_RESULT=$(forge create contract/proxy/GmeowProxy.sol:GmeowProxy \
  --constructor-args $CORE_ADDRESS $GUILD_ADDRESS $NFT_ADDRESS \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL \
  --json 2>/dev/null)

if [ $? -eq 0 ]; then
  PROXY_ADDRESS=$(echo $PROXY_RESULT | jq -r '.deployedTo')
  PROXY_TX=$(echo $PROXY_RESULT | jq -r '.transactionHash')
  
  echo "✅ Proxy deployed successfully!"
  echo "Address: $PROXY_ADDRESS"
  echo "TX: $PROXY_TX"
  
  # Verify implementation addresses
  echo ""
  echo "Verifying proxy setup..."
  echo -n "Core impl: "
  cast call $PROXY_ADDRESS "coreImpl()" --rpc-url $RPC_URL
  echo -n "Guild impl: "
  cast call $PROXY_ADDRESS "guildImpl()" --rpc-url $RPC_URL
  echo -n "NFT impl: "
  cast call $PROXY_ADDRESS "nftImpl()" --rpc-url $RPC_URL
  
  echo ""
  echo "🎉 Base deployment complete!"
  echo "PROXY: $PROXY_ADDRESS"
  
else
  echo "❌ Proxy deployment failed"
  exit 1
fi