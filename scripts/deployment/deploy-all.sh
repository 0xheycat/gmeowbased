#!/bin/bash
# Master Deployment Script for Gmeow Contracts
# Supports all chains from gm-utils.ts configuration

set -e

echo "🌐 Gmeow Multi-Chain Deployment Manager"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "foundry.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ Error: .env.local file not found"
    echo "   Please create .env.local with your ORACLE_PRIVATE_KEY"
    exit 1
fi

# Function to check if deployment script exists
check_deployment_script() {
    local chain=$1
    local script_path="scripts/deployment/deploy-${chain}.sh"
    
    if [ ! -f "$script_path" ]; then
        echo "❌ Deployment script not found: $script_path"
        return 1
    fi
    
    if [ ! -x "$script_path" ]; then
        echo "🔧 Making deployment script executable: $script_path"
        chmod +x "$script_path"
    fi
    
    return 0
}

# Function to run deployment
run_deployment() {
    local chain=$1
    local script_path="scripts/deployment/deploy-${chain}.sh"
    
    echo ""
    echo "🚀 Starting deployment for $chain..."
    echo "========================================"
    
    # Change to project root and run script
    bash "$script_path"
    
    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
        echo ""
        echo "✅ $chain deployment completed successfully!"
    else
        echo ""
        echo "❌ $chain deployment failed with exit code: $exit_code"
        return $exit_code
    fi
}

# Function to show deployment status
show_deployment_status() {
    echo ""
    echo "📊 Deployment Status"
    echo "==================="
    
    local chains=("base" "optimism" "unichain" "celo" "arbitrum" "ink")
    
    for chain in "${chains[@]}"; do
        local record_file="deployment-records/${chain}-deployment.json"
        if [ -f "$record_file" ]; then
            local date=$(jq -r '.deploymentDate' "$record_file" 2>/dev/null || echo "Unknown")
            local proxy=$(jq -r '.contracts.proxy' "$record_file" 2>/dev/null || echo "Unknown")
            printf "✅ %-10s | %s | %s\n" "$chain" "$date" "$proxy"
        else
            printf "⏳ %-10s | Not deployed\n" "$chain"
        fi
    done
}

# Main menu
while true; do
    echo ""
    echo "🎯 Select deployment option:"
    echo ""
    echo "Individual Chains:"
    echo "  1) Base Mainnet (Chain ID: 8453)"
    echo "  2) Optimism Mainnet (Chain ID: 10)"
    echo "  3) Unichain Mainnet (Chain ID: 1301)"
    echo "  4) Celo Mainnet (Chain ID: 42220)"
    echo "  5) Arbitrum One (Chain ID: 42161)"
    echo "  6) Ink Mainnet (Chain ID: 57073)"
    echo ""
    echo "Batch Operations:"
    echo "  7) Deploy All Chains (Sequential)"
    echo "  8) Show Deployment Status"
    echo "  9) Exit"
    echo ""
    
    read -p "Enter your choice (1-9): " choice
    
    case $choice in
        1)
            if check_deployment_script "base"; then
                run_deployment "base"
            fi
            ;;
        2)
            if check_deployment_script "optimism"; then
                run_deployment "optimism"
            fi
            ;;
        3)
            if check_deployment_script "unichain"; then
                run_deployment "unichain"
            fi
            ;;
        4)
            if check_deployment_script "celo"; then
                run_deployment "celo"
            fi
            ;;
        5)
            if check_deployment_script "arbitrum"; then
                run_deployment "arbitrum"
            fi
            ;;
        6)
            if check_deployment_script "ink"; then
                run_deployment "ink"
            fi
            ;;
        7)
            echo ""
            echo "🔄 Starting batch deployment for all chains..."
            echo "⚠️  This will deploy to ALL chains sequentially"
            echo ""
            read -p "Are you sure? (y/N): " confirm
            
            if [[ $confirm =~ ^[Yy]$ ]]; then
                local chains=("base" "optimism" "unichain" "celo" "arbitrum" "ink")
                local success_count=0
                local total_count=${#chains[@]}
                
                for chain in "${chains[@]}"; do
                    echo ""
                    echo "🎯 Deploying chain $((success_count + 1))/$total_count: $chain"
                    
                    if check_deployment_script "$chain" && run_deployment "$chain"; then
                        ((success_count++))
                        echo ""
                        echo "✅ $chain deployment successful ($success_count/$total_count)"
                        sleep 2
                    else
                        echo ""
                        echo "❌ $chain deployment failed. Stopping batch deployment."
                        break
                    fi
                done
                
                echo ""
                echo "📊 Batch Deployment Complete"
                echo "============================="
                echo "✅ Successful: $success_count/$total_count chains"
                
                if [ $success_count -eq $total_count ]; then
                    echo "🎉 All chains deployed successfully!"
                else
                    echo "⚠️  Some deployments failed. Check the logs above."
                fi
            else
                echo "❌ Batch deployment cancelled"
            fi
            ;;
        8)
            show_deployment_status
            ;;
        9)
            echo ""
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please enter 1-9."
            ;;
    esac
done