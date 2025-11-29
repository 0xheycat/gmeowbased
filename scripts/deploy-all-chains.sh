#!/bin/bash

echo "🚀 MULTI-CHAIN DEPLOYMENT GUIDE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Base Mainnet:     COMPLETE ✅"
echo "✅ Optimism:         COMPLETE ✅" 
echo ""
echo "📋 Remaining chains to deploy:"
echo "   1️⃣  Unichain Mainnet"
echo "   2️⃣  Celo Mainnet"  
echo "   3️⃣  Arbitrum Mainnet"
echo "   4️⃣  Ink Mainnet"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PRIVATE_KEY=$(grep ORACLE_PRIVATE_KEY .env.local | cut -d= -f2)
ORACLE_ADDRESS=$(cast wallet address $PRIVATE_KEY)

echo "🔐 Oracle Address: $ORACLE_ADDRESS"
echo ""

echo "Choose which chain to deploy next:"
echo ""
echo "1) Deploy to Unichain"
echo "2) Deploy to Celo" 
echo "3) Deploy to Arbitrum"
echo "4) Deploy to Ink"
echo "5) Deploy to ALL remaining chains (automated)"
echo "6) Show deployment status"
echo "0) Exit"
echo ""

read -p "Enter your choice (0-6): " choice

case $choice in
  1)
    echo "🚀 Starting Unichain deployment..."
    ./scripts/deploy-unichain.sh
    ;;
  2)
    echo "🚀 Starting Celo deployment..."
    ./scripts/deploy-celo.sh
    ;;
  3)
    echo "🚀 Starting Arbitrum deployment..."
    ./scripts/deploy-arbitrum.sh
    ;;
  4)
    echo "🚀 Starting Ink deployment..."
    ./scripts/deploy-ink.sh
    ;;
  5)
    echo "🚀 Starting ALL remaining deployments..."
    echo ""
    echo "⚠️  This will deploy to all 4 remaining chains sequentially."
    echo "    Make sure you have sufficient balance on all chains!"
    echo ""
    read -p "Continue? (y/N): " confirm
    if [[ $confirm =~ ^[Yy]$ ]]; then
      echo ""
      echo "🔄 Deploying to Unichain..."
      ./scripts/deploy-unichain.sh
      echo ""
      echo "🔄 Deploying to Celo..."
      ./scripts/deploy-celo.sh
      echo ""
      echo "🔄 Deploying to Arbitrum..."
      ./scripts/deploy-arbitrum.sh
      echo ""
      echo "🔄 Deploying to Ink..."
      ./scripts/deploy-ink.sh
      echo ""
      echo "🎉 ALL DEPLOYMENTS COMPLETE!"
    else
      echo "Cancelled."
    fi
    ;;
  6)
    echo "📊 DEPLOYMENT STATUS:"
    echo ""
    echo "✅ Base Mainnet:     COMPLETE"
    if [ -f "deployment-base-mainnet.json" ]; then
      echo "   📄 deployment-base-mainnet.json"
    fi
    echo ""
    echo "✅ Optimism:         COMPLETE" 
    echo ""
    echo "❓ Unichain:         PENDING"
    if [ -f "deployment-unichain-mainnet.json" ]; then
      echo "✅ Unichain:         COMPLETE"
      echo "   📄 deployment-unichain-mainnet.json"
    fi
    echo ""
    echo "❓ Celo:             PENDING"
    if [ -f "deployment-celo-mainnet.json" ]; then
      echo "✅ Celo:             COMPLETE"
      echo "   📄 deployment-celo-mainnet.json"
    fi
    echo ""
    echo "❓ Arbitrum:         PENDING"
    if [ -f "deployment-arbitrum-mainnet.json" ]; then
      echo "✅ Arbitrum:         COMPLETE"
      echo "   📄 deployment-arbitrum-mainnet.json"
    fi
    echo ""
    echo "❓ Ink:              PENDING"
    if [ -f "deployment-ink-mainnet.json" ]; then
      echo "✅ Ink:              COMPLETE"
      echo "   📄 deployment-ink-mainnet.json"
    fi
    ;;
  0)
    echo "Goodbye! 👋"
    ;;
  *)
    echo "❌ Invalid choice. Please run the script again."
    ;;
esac