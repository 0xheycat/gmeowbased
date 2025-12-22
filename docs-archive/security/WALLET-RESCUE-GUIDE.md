# Wallet Rescue Bot - Professional Setup Guide

## Overview

This rescue bot monitors your compromised wallet 24/7 and automatically sends any incoming tokens to your safe wallet **before the hacker can steal them**. This is the same technique used by professional security researchers and white-hat hackers.

## How It Works

1. **Monitoring**: Bot watches every new block for token transfers to your compromised address
2. **Detection**: When airdrop/token arrives, instant notification sent
3. **Rescue**: Immediately sends token to your safe wallet with high gas priority
4. **Front-running**: Uses gas auction strategy to outbid the hacker's bot

## Quick Start

### 1. Prerequisites

```bash
# Ensure you have the compromised wallet's private key
# Already set in .env.local as DRAINED_PRIVKEY

# Set your NEW safe wallet address
# Edit .env.local and update:
SAFE_WALLET_ADDRESS=0xYourNewSafeWalletHere
```

### 2. Fund the Compromised Wallet

**CRITICAL**: The compromised wallet needs ETH for gas to send tokens out.

```bash
# Minimum required: 0.001 ETH (~$3)
# Recommended: 0.01 ETH (~$30) for multiple rescues

# Send ETH to your compromised wallet
# Yes, the hacker can see this ETH, but they need it there too!
# The goal is to be FASTER when tokens arrive
```

**Strategy**: Send small amounts of ETH regularly (e.g., 0.005 ETH each time) so you always have gas available but minimize hacker's profit.

### 3. Run the Basic Bot (Recommended for Testing)

```bash
# Test the basic version first
npx tsx scripts/wallet-rescue-bot.ts
```

You should see:
```
🔍 Monitoring compromised wallet: 0x...
🛡️  Safe wallet: 0x...
📊 Starting from block: 123456
✅ Monitoring active - will auto-rescue any incoming tokens
```

### 4. Run the Advanced Bot (Production)

```bash
# More aggressive with MEV protection
npx tsx scripts/wallet-rescue-bot-advanced.ts
```

## Running 24/7 on a Server

### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot
pm2 start scripts/wallet-rescue-bot.ts --name "rescue-bot" --interpreter tsx

# Enable auto-restart on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs rescue-bot

# Stop the bot
pm2 stop rescue-bot
```

### Option B: Using Docker

```dockerfile
# Create Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npx", "tsx", "scripts/wallet-rescue-bot.ts"]
```

```bash
# Build and run
docker build -t rescue-bot .
docker run -d --name rescue-bot --env-file .env.local rescue-bot
```

### Option C: Using systemd (Linux servers)

```bash
# Create service file
sudo nano /etc/systemd/system/rescue-bot.service
```

```ini
[Unit]
Description=Wallet Rescue Bot
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/Gmeowbased
ExecStart=/usr/bin/npx tsx scripts/wallet-rescue-bot.ts
Restart=always
RestartSec=10
EnvironmentFile=/path/to/Gmeowbased/.env.local

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable rescue-bot
sudo systemctl start rescue-bot
sudo systemctl status rescue-bot
```

## Notifications Setup

### Telegram Alerts

1. Create a bot with @BotFather on Telegram
2. Get your bot token
3. Get your chat ID by messaging @userinfobot
4. Add to `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### Discord Alerts

1. Go to your Discord server settings
2. Integrations → Webhooks → New Webhook
3. Copy webhook URL
4. Add to `.env.local`:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Success Indicators

When the bot detects and rescues tokens, you'll see:

```
🚨 AIRDROP DETECTED: 1000.0000 TOKEN
⚡ Initiating immediate rescue...
⛽ Gas price: 2.5 gwei (1.5x multiplier)
📤 Rescue transaction sent: 0xabc123...
⏳ Waiting for confirmation...
✅ RESCUE SUCCESSFUL! Block: 123457
```

## Troubleshooting

### "Low ETH balance" warning
→ Send more ETH to the compromised wallet

### "Rescue failed: insufficient funds"
→ The bot tried to rescue but didn't have enough ETH for gas
→ Send 0.01 ETH to compromised wallet

### "Rescue failed: execution reverted"
→ The hacker was faster this time
→ Increase `GAS_BUFFER_MULTIPLIER` in the script (try 2.0 or higher)

### No tokens detected
→ Bot is working! Just waiting for airdrops
→ Test by sending 1 USDC to your compromised wallet

## Advanced Techniques

### 1. Gas Price Strategy

Edit `scripts/wallet-rescue-bot.ts`:

```typescript
// More aggressive (pay 3x current gas)
const GAS_BUFFER_MULTIPLIER = 3.0

// Maximum gas you're willing to pay (100 gwei)
const MAX_GAS_PRICE = parseEther('0.0001') // adjust as needed
```

### 2. Mempool Monitoring

The advanced bot can detect pending transactions (before they're mined):

```typescript
// In wallet-rescue-bot-advanced.ts
const MEMPOOL_POLL_INTERVAL = 500 // Check every 500ms
```

### 3. Multi-Chain Support

Monitor multiple chains simultaneously:

```bash
# Run separate instances for different chains
pm2 start scripts/wallet-rescue-bot.ts --name "rescue-base"
pm2 start scripts/wallet-rescue-bot.ts --name "rescue-eth" -- --chain ethereum
pm2 start scripts/wallet-rescue-bot.ts --name "rescue-optimism" -- --chain optimism
```

## Professional Tips from Security Researchers

1. **Keep emergency ETH**: Always maintain 0.01 ETH in compromised wallet
2. **Monitor gas prices**: During high congestion, be ready to pay more
3. **Use VPS**: Run on cloud server (AWS, Digital Ocean) for 24/7 uptime
4. **Multiple instances**: Run bot on 2-3 different servers for redundancy
5. **Test first**: Send yourself a test token to verify bot works
6. **Log everything**: Keep records of all rescues for tax/accounting
7. **Competitive advantage**: Faster RPC = better success rate

## Cost Analysis

- **VPS hosting**: $5-10/month (Digital Ocean, Linode)
- **Gas costs**: ~$1-5 per rescue (depending on network)
- **Emergency ETH**: 0.01 ETH (~$30) kept in compromised wallet
- **Total monthly cost**: ~$15-50 to rescue unlimited airdrops

**ROI**: If you rescue even one $100+ airdrop, you've paid for months of operation.

## Security Considerations

✅ **SAFE**:
- Storing compromised wallet key (it's already compromised)
- Running bot on VPS with .env.local
- Sending gas ETH to compromised wallet

❌ **NEVER**:
- Store your SAFE wallet private key anywhere
- Run bot with your main wallet credentials
- Share your .env.local file
- Commit private keys to git

## When to Stop the Bot

You can stop the rescue bot when:
1. You've recovered all expected airdrops
2. The wallet has been inactive for 6+ months
3. Gas costs exceed potential airdrop value
4. You've created a new identity and don't need old wallet anymore

## Questions?

Check these resources:
- Flashbots documentation: https://docs.flashbots.net
- MEV protection: https://collective.flashbots.net
- Gas price strategies: https://etherscan.io/gastracker

## Legal Disclaimer

This bot is designed to rescue YOUR OWN funds from a compromised wallet. Using this to access funds you don't own is illegal. Always comply with local laws and regulations.

---

**Status**: Ready to deploy
**Last Updated**: December 21, 2025
**Maintenance**: Check logs weekly, update RPC endpoints monthly
