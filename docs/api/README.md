# API Documentation

Complete API reference for GMEOWBASED platform integration.

## 🌐 REST API

### Core Endpoints
- **[API Reference](./api-reference.md)** - Complete API documentation
- **[Overview](./overview.md)** - API architecture and authentication
- **[Frame API](./frames.md)** - Farcaster frame generation endpoints
- **[Quest API](./quests.md)** - Quest creation and management
- **[Leaderboard API](./leaderboards.md)** - Rankings and stats
- **[NFT Mint API](./nft-mint.md)** - NFT minting endpoints

### API Routes

#### Frame Routes
```
GET  /api/frame?type={type}&id={id}       - Generate frame metadata
GET  /api/frame/og?title={title}          - Generate OG images
POST /api/frame/identify                  - Frame user identification
```

#### Bot & Webhook Routes
```
POST /api/neynar/webhook                  - Neynar webhook handler
GET  /api/bot/config                      - Bot configuration
POST /api/bot/reply                       - Manual bot reply
```

#### NFT Routes
```
POST /api/nft/mint                        - Mint achievement NFT
GET  /api/nft/metadata/{id}               - NFT metadata
GET  /api/nft/owned/{address}             - User's NFT collection
```

#### Quest Routes
```
GET  /api/quests                          - List quests
POST /api/quests/create                   - Create quest
POST /api/quests/verify                   - Verify quest completion
GET  /api/quests/{id}                     - Quest details
```

## 🔌 Webhooks

### Webhook Integration
- **[Neynar Webhooks](./webhooks/neynar.md)** - Farcaster event webhooks
- **[Webhook Verification](./webhooks/verification.md)** - HMAC signature validation
- **[Event Types](./webhooks/event-types.md)** - Cast created, user mentioned, etc.
- **[Webhook Testing](./webhooks/testing.md)** - Local testing setup

### Webhook Events
```typescript
interface CastCreatedEvent {
  type: 'cast.created'
  data: {
    hash: string
    author: { fid: number; username: string }
    text: string
    mentioned_profiles: Profile[]
  }
}

interface MiniappEvent {
  event: 'miniapp_added' | 'miniapp_removed' | 'notifications_enabled'
  notificationDetails: { token: string; url: string }
  fid: number
}
```

## 📦 Smart Contracts

### Contract Interfaces
- **[GmeowMultiChain](./contracts/gmeow-multichain.md)** - Main quest contract
- **[SoulboundBadge](./contracts/soulbound-badge.md)** - NFT achievement badges
- **[Contract ABIs](./contracts/abis.md)** - Complete ABI documentation
- **[Chain Addresses](./contracts/addresses.md)** - Deployed contract addresses

### Supported Chains
```typescript
const CHAINS = {
  base: 'Base',
  op: 'Optimism',
  celo: 'Celo',
  unichain: 'Unichain',
  ink: 'Ink'
}
```

## 🔐 Authentication

### Authentication Methods
- **[Farcaster Auth](./auth/farcaster.md)** - FID-based authentication
- **[Wallet Auth](./auth/wallet.md)** - Wallet signature authentication
- **[API Keys](./auth/api-keys.md)** - Service-to-service auth
- **[Miniapp Context](./auth/miniapp.md)** - Farcaster miniapp authentication

### Example: Authenticated Request
```typescript
const response = await fetch('/api/quests/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Farcaster-FID': userFid.toString(),
  },
  body: JSON.stringify(questData)
})
```

## 📡 External APIs

### Neynar API
- **[User Lookup](./external/neynar-users.md)** - Fetch user by FID/username
- **[Cast Publishing](./external/neynar-casts.md)** - Publish casts via bot
- **[Notifications](./external/neynar-notifications.md)** - Push notifications
- **[Rate Limits](./external/neynar-limits.md)** - API rate limiting

### Blockchain RPCs
- **[RPC Configuration](./external/rpc-config.md)** - RPC endpoints per chain
- **[Contract Calls](./external/contract-calls.md)** - Reading contract data
- **[Transaction Building](./external/transactions.md)** - Building and signing txs

## 📊 Response Formats

### Success Response
```typescript
interface ApiSuccess<T> {
  ok: true
  data: T
  meta?: Record<string, unknown>
}
```

### Error Response
```typescript
interface ApiError {
  ok: false
  error: string
  detail?: string
  code?: string
}
```

### Frame Response
```html
<!DOCTYPE html>
<html>
  <head>
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="{imageUrl}" />
    <meta property="fc:frame:button:1" content="{label}" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="{url}" />
  </head>
</html>
```

## 🛠️ SDK & Libraries

### Official Libraries
- **[Frame Builder](./sdk/frame-builder.md)** - Frame generation utilities
- **[Bot Frame Builder](./sdk/bot-frame-builder.md)** - Bot frame helpers
- **[Contract Utils](./sdk/contract-utils.md)** - Smart contract helpers
- **[Type Definitions](./sdk/types.md)** - TypeScript types

### Example: Frame Builder
```typescript
import { buildFrameShareUrl } from '@/lib/share'

const frameUrl = buildFrameShareUrl({
  type: 'quest',
  chain: 'base',
  questId: 42,
  fid: 12345
})
// => https://gmeowhq.art/api/frame?type=quest&chain=base&questId=42&fid=12345
```

## 🧪 Testing

- **[API Testing](./testing/api-testing.md)** - Endpoint testing guide
- **[Webhook Testing](./testing/webhook-testing.md)** - Webhook simulation
- **[Contract Testing](./testing/contract-testing.md)** - Smart contract tests
- **[Integration Tests](./testing/integration-tests.md)** - E2E API tests

## 📈 Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| `/api/frame/*` | 100/min | Cached responses |
| `/api/nft/mint` | 10/min | Per user |
| `/api/quests/create` | 20/hour | Per creator |
| `/api/neynar/webhook` | 1000/min | Global |

## 🔗 Quick Links

- **[Full API Reference](./reference.md)** - Complete API documentation
- **[Integration Examples](./examples/)** - Code examples
- **[Postman Collection](./postman-collection.json)** - API testing collection
- **[OpenAPI Spec](./openapi.yaml)** - OpenAPI 3.0 specification

---

**Need help?** Check the [Usage Guide](../USAGE_GUIDE.md) or [Features Documentation](../features/README.md).
