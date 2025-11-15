# Architecture Documentation

Technical architecture and system design documentation for GMEOWBASED.

## 🏗️ System Overview

### High-Level Architecture
- **[System Overview](./system-overview.md)** - Complete platform architecture
- **[Technology Stack](./technology-stack.md)** - All technologies used
- **[Data Flow](./data-flow.md)** - How data moves through the system
- **[Component Architecture](./component-architecture.md)** - Frontend component structure

### Core Systems
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Quest Wizard│  │   Frames    │  │  Leaderboard│    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Frame API  │  │  Quest API  │  │   Bot API   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Neynar     │  │   Supabase   │  │  Blockchain  │
│   (Farcaster)│  │  (Database)  │  │  (Contracts) │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 🎯 Feature Architecture

### Quest System
- **[Quest Architecture](./quest-architecture.md)** - Quest system design
- **[Quest Wizard Flow](./quest-wizard-flow.md)** - Creation flow architecture
- **[Quest Verification](./quest-verification-arch.md)** - Verification system
- **[Quest Storage](./quest-storage.md)** - Data persistence strategy

### Frame System
- **[Frame Architecture](./frame-architecture.md)** - Frame generation system
- **[Frame Metadata](./frame-metadata.md)** - Farcaster frame spec implementation
- **[Bot Frame Builder](./bot-frame-builder-arch.md)** - Automated frame embeds
- **[Frame Caching](./frame-caching.md)** - Performance optimization

### Bot System
- **[Bot Architecture](./bot-architecture.md)** - Complete bot system design
- **[Intent Detection](./intent-detection-arch.md)** - User intent classification
- **[Auto-Reply Engine](./auto-reply-engine.md)** - Response generation logic
- **[Webhook Processing](./webhook-processing.md)** - Event handling pipeline

### NFT System
- **[NFT Architecture](./nft-architecture.md)** - Badge minting system
- **[Soulbound Implementation](./soulbound-implementation.md)** - Non-transferable tokens
- **[Metadata Generation](./metadata-generation.md)** - Dynamic NFT metadata
- **[Multi-Chain Support](./multi-chain-nft.md)** - Cross-chain NFT strategy

## 🗄️ Database Architecture

### Supabase Schema
- **[Database Schema](./database-schema.md)** - Complete schema documentation
- **[Table Relationships](./table-relationships.md)** - Entity relationships
- **[Indexes & Performance](./database-indexes.md)** - Query optimization
- **[RLS Policies](./rls-policies.md)** - Row-level security

### Data Models
```typescript
// Core Entities
User → Profile → Stats → Achievements
Quest → QuestCompletion → Reward
Guild → GuildMember → GuildRank
NFT → NFTMetadata → NFTOwnership
```

## ⛓️ Smart Contract Architecture

### Contract Design
- **[Contract Overview](./contract-overview.md)** - All smart contracts
- **[GmeowMultiChain](./gmeow-multichain-contract.md)** - Main quest contract
- **[SoulboundBadge](./soulbound-badge-contract.md)** - Badge NFT contract
- **[Contract Upgrades](./contract-upgrades.md)** - Upgrade strategy

### Multi-Chain Strategy
- **[Chain Deployment](./chain-deployment.md)** - Deployment per chain
- **[Cross-Chain Sync](./cross-chain-sync.md)** - Data synchronization
- **[Chain-Specific Features](./chain-specific-features.md)** - Per-chain optimizations

## 🔌 Integration Architecture

### External APIs
- **[Neynar Integration](./neynar-integration.md)** - Farcaster API integration
- **[RPC Architecture](./rpc-architecture.md)** - Blockchain RPC setup
- **[Wagmi Integration](./wagmi-integration.md)** - Wallet integration
- **[Farcaster Miniapp](./miniapp-architecture.md)** - Miniapp SDK usage

### Webhook System
- **[Webhook Architecture](./webhook-architecture.md)** - Event processing system
- **[Event Queue](./event-queue.md)** - Async event handling
- **[Retry Logic](./retry-logic.md)** - Failure recovery
- **[Webhook Security](./webhook-security.md)** - HMAC verification

## 🚀 Performance Architecture

### Frontend Performance
- **[Rendering Strategy](./rendering-strategy.md)** - SSR vs CSR decisions
- **[Code Splitting](./code-splitting-arch.md)** - Bundle optimization
- **[Image Optimization](./image-optimization.md)** - Next.js Image usage
- **[Lazy Loading](./lazy-loading.md)** - Component lazy loading

### Caching Strategy
- **[Caching Overview](./caching-overview.md)** - Multi-layer caching
- **[API Caching](./api-caching.md)** - HTTP caching headers
- **[Database Caching](./database-caching.md)** - Query result caching
- **[Client Caching](./client-caching.md)** - React Query/SWR

### Optimization Techniques
- **[requestIdleCallback Usage](./request-idle-callback.md)** - Non-blocking operations
- **[Debouncing & Throttling](./debouncing-throttling.md)** - Input optimization
- **[Web Vitals](./web-vitals.md)** - Performance metrics

## 🔐 Security Architecture

### Authentication & Authorization
- **[Auth Flow](./auth-flow.md)** - Complete authentication flow
- **[FID Verification](./fid-verification.md)** - Farcaster ID validation
- **[Wallet Signatures](./wallet-signatures.md)** - Signature verification
- **[Session Management](./session-management.md)** - Session handling

### Security Measures
- **[CORS Configuration](./cors-configuration.md)** - Cross-origin security
- **[CSP Headers](./csp-headers.md)** - Content Security Policy
- **[Rate Limiting](./rate-limiting.md)** - API rate limits
- **[Input Validation](./input-validation.md)** - Sanitization & validation

## 📊 Monitoring & Observability

### Logging Architecture
- **[Logging Strategy](./logging-strategy.md)** - Structured logging
- **[Error Tracking](./error-tracking-arch.md)** - Sentry integration
- **[Log Aggregation](./log-aggregation.md)** - Centralized logging
- **[Debug Traces](./debug-traces.md)** - Request tracing

### Monitoring Systems
- **[Performance Monitoring](./performance-monitoring-arch.md)** - Real-time metrics
- **[Alert System](./alert-system.md)** - Alert configuration
- **[Health Checks](./health-checks.md)** - Service health monitoring
- **[Analytics](./analytics-architecture.md)** - Usage analytics

## 🛠️ Development Architecture

### Development Workflow
- **[Git Workflow](./git-workflow.md)** - Branching strategy
- **[CI/CD Pipeline](./cicd-pipeline.md)** - Automated deployment
- **[Testing Strategy](./testing-strategy.md)** - Test pyramid approach
- **[Code Review Process](./code-review-process.md)** - Review guidelines

### Development Tools
- **[TypeScript Configuration](./typescript-config.md)** - TS setup
- **[ESLint & Prettier](./linting-formatting.md)** - Code quality
- **[Testing Infrastructure](./testing-infrastructure.md)** - Jest, Playwright
- **[Local Development](./local-development.md)** - Dev environment setup

## 📐 Design Patterns

### Frontend Patterns
- **[Component Patterns](./component-patterns.md)** - React patterns
- **[Hook Patterns](./hook-patterns.md)** - Custom hooks
- **[State Management](./state-management-patterns.md)** - State patterns
- **[Error Boundaries](./error-boundaries.md)** - Error handling

### Backend Patterns
- **[API Patterns](./api-patterns.md)** - REST API design
- **[Repository Pattern](./repository-pattern.md)** - Data access
- **[Factory Pattern](./factory-pattern.md)** - Object creation
- **[Observer Pattern](./observer-pattern.md)** - Event handling

## 🏛️ Architectural Decision Records (ADRs)

### ADR Index
- **[ADR-001: Quest Wizard Refactor](../adr/001-quest-wizard-refactor.md)** - Quest UI redesign
- **[ADR-002: Testing Strategy](../adr/002-testing-strategy.md)** - Test approach
- **[ADR-003: Frame Architecture](../adr/003-frame-architecture.md)** - Frame system design
- **[ADR-004: Bot Intelligence](../adr/004-bot-intelligence.md)** - Bot system design
- **[ADR-005: Multi-Chain Strategy](../adr/005-multi-chain-strategy.md)** - Chain deployment

### Creating ADRs
- **[ADR Template](./adr-template.md)** - Template for new ADRs
- **[ADR Process](./adr-process.md)** - When and how to create ADRs

## 🔄 Migration & Upgrades

### Version Migration
- **[Migration Strategy](./migration-strategy.md)** - Version upgrade process
- **[Database Migrations](./database-migrations.md)** - Schema changes
- **[Contract Upgrades](./contract-upgrade-process.md)** - Smart contract upgrades
- **[Breaking Changes](./breaking-changes.md)** - Handling breaking changes

## 📚 Technical References

### Code Organization
- **[Project Structure](./project-structure.md)** - Folder organization
- **[Naming Conventions](./naming-conventions.md)** - Coding standards
- **[Module Dependencies](./module-dependencies.md)** - Dependency graph
- **[Package Management](./package-management.md)** - pnpm usage

### API Specifications
- **[REST API Spec](./rest-api-spec.md)** - OpenAPI documentation
- **[GraphQL Schema](./graphql-schema.md)** - GraphQL types (if applicable)
- **[WebSocket Protocol](./websocket-protocol.md)** - Real-time communication
- **[Frame Protocol](./frame-protocol.md)** - Farcaster frame spec

---

**Need implementation details?** Check [Features Documentation](../features/README.md)  
**Want integration guides?** See [API Documentation](../api/README.md)
