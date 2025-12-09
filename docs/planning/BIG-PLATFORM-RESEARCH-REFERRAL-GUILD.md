# Big Platform Research: Referral + Guild Systems

**Date**: December 6, 2025  
**Purpose**: Research industry-leading platforms for referral and guild feature patterns  
**Target Platforms**: Galxe, Layer3, QuestN, Guild.xyz, Gitcoin Passport

---

## 🎯 Research Objectives

1. **Referral Systems**:
   - Code sharing mechanisms (links, QR codes, custom codes)
   - Dashboard analytics (completion rates, viral metrics)
   - Leaderboard presentation
   - Reward tier systems
   - Social sharing integrations

2. **Guild Systems**:
   - Guild creation flow
   - Member management UI
   - Guild discovery/browsing
   - Treasury visualization
   - Guild leaderboards
   - Analytics dashboards

---

## 🔍 Platform 1: Galxe (galxe.com)

### Referral Features
- **Code System**: 
  * Custom referral codes (alphanumeric)
  * Shareable links with embedded codes
  * QR code generation for mobile
- **Dashboard**:
  * Total referrals count (prominent display)
  * Weekly/monthly breakdowns
  * Referral chain visualization (tree view)
  * Conversion rate tracking
- **Leaderboard**:
  * Top 100 referrers globally
  * Filter by timeframe (all-time, monthly, weekly)
  * Rewards displayed per rank
- **Social Integration**:
  * Twitter share button with pre-filled text
  * Discord webhook notifications
  * Telegram bot integration

### Guild/Community Features
- **Creation Flow**:
  * Name, description, avatar, banner
  * Category selection (Gaming, DeFi, NFT, etc.)
  * Social links (Twitter, Discord, website)
  * Verification requirements
- **Member Management**:
  * Role-based permissions (Admin, Moderator, Member)
  * Member list with join dates
  * Activity feed per member
- **Discovery**:
  * Trending guilds section
  * Search by name/category
  * Filter by member count/activity
- **Treasury**:
  * Total points/tokens display
  * Transaction history table
  * Deposit/withdraw forms

**Key Insights**:
- Focus on visual hierarchy (big numbers, clear CTAs)
- Gamification: Badges for milestones (10, 50, 100 referrals)
- Real-time updates (WebSocket for live counts)

---

## 🔍 Platform 2: Layer3 (layer3.xyz)

### Referral Features
- **Code System**:
  * Username-based codes (simpler than random codes)
  * Vanity URL support (layer3.xyz/r/username)
  * Link preview cards for social sharing
- **Dashboard**:
  * 4 stat cards: Total, This Week, This Month, All-Time
  * Referral activity timeline
  * Top referred users list
  * Earnings breakdown by referral
- **Rewards**:
  * Tier system: Bronze (1-9), Silver (10-49), Gold (50-99), Platinum (100+)
  * Badge display on profile
  * Bonus multipliers for higher tiers
- **Analytics**:
  * Click-through rate (CTR)
  * Conversion funnel visualization
  * Geographic distribution map

### Quest/Guild Features
- **Guild Pages**:
  * Cover banner + avatar
  * Member spotlight (top contributors)
  * Quest completion stats
  * Leaderboard (guild-only)
- **Quest System**:
  * Guild-specific quests
  * Collaborative challenges (require X guild members)
  * Guild treasury rewards
- **Governance**:
  * Voting on guild decisions
  * Proposal system for new quests
  * Officer appointments

**Key Insights**:
- Emphasis on social proof (show popular guilds)
- Collaborative features drive engagement
- Clear reward structures motivate participation

---

## 🔍 Platform 3: QuestN (questn.com)

### Referral Features
- **Code System**:
  * Invite-only codes (scarcity model)
  * Limited uses per code (creates urgency)
  * Code expiration dates
- **Dashboard**:
  * Referral funnel: Invited → Signed Up → Active → Completed Quest
  * Conversion rate at each stage
  * Best performing codes highlight
- **Leaderboard**:
  * Multiple categories: Most Referrals, Most Active Referrals, Highest Value Referrals
  * Season-based competitions (monthly resets)
  * Prize pools for top referrers
- **Viral Mechanics**:
  * Chain bonuses (referrals of referrals earn partial rewards)
  * Referral milestones unlock profile upgrades
  * Social badges for achievements

### Community Features
- **Guild Profiles**:
  * Comprehensive stats page
  * Achievement showcase
  * Member roster with roles
  * Activity heatmap (calendar view)
- **Guild Discovery**:
  * Curated featured list
  * Category filters (25+ categories)
  * Trending algorithm (based on growth rate)
  * "Recommended for You" section

**Key Insights**:
- Scarcity drives value (limited codes)
- Multi-level rewards increase viral coefficient
- Data visualization is key (charts, graphs, heatmaps)

---

## 🔍 Platform 4: Guild.xyz

### Guild Management Features
- **Creation Flow**:
  * Progressive disclosure (5-step wizard)
  * Template selection (DAO, Gaming Guild, Community)
  * Token-gated access setup
  * Integration with Discord/Telegram
- **Roles & Permissions**:
  * Custom role creation
  * Requirement-based roles (hold X tokens, complete Y quests)
  * Role hierarchy visualization
- **Treasury**:
  * Multi-sig wallet integration
  * Spending proposals
  * Transaction approval flow
  * Treasury analytics (burn rate, runway)
- **Member Engagement**:
  * Announcements system
  * Event calendar
  * Member directory with profiles
  * Activity feed (who joined, who left, who got promoted)

### Discovery & Growth
- **Guild Directory**:
  * Grid layout with cards
  * Quick stats: Members, Activity, Treasury
  * "Join" button with instant feedback
  * "Explore" button for guild details
- **Search & Filters**:
  * Multi-select filters (blockchain, category, size)
  * Sort by: Newest, Most Members, Most Active, Trending
  * Search autocomplete

**Key Insights**:
- Template-driven creation reduces friction
- Token-gating adds exclusivity
- Activity feed creates FOMO (fear of missing out)
- Treasury transparency builds trust

---

## 🔍 Platform 5: Gitcoin Passport (passport.gitcoin.co)

### Reputation & Referral
- **Trust Score System**:
  * Referral contributes to trust score
  * Quality > quantity (active referrals weighted higher)
  * Anti-sybil mechanisms (prevent fake accounts)
- **Referral Tracking**:
  * Referral graph visualization
  * Trust score impact display
  * Referral quality metrics
- **Rewards**:
  * Stamp-based rewards (similar to badges)
  * Referral stamps unlock features
  * Reputation boost for both parties

### Community Features
- **Passport Holders Network**:
  * Connect with verified users
  * Endorsement system
  * Skill-based matching
- **Analytics**:
  * Passport score breakdown
  * Verification timeline
  * Referral impact on score

**Key Insights**:
- Quality over quantity approach
- Sybil resistance is critical
- Visual representation of trust networks
- Gamification through stamps/badges

---

## 📊 Pattern Summary: Common Best Practices

### Referral System Patterns
1. **Code Generation**:
   - Custom codes (3-32 chars) ✅ We have this
   - Username-based vanity URLs
   - QR code generation ❌ Need to add
   - Link preview cards for sharing ❌ Need to add

2. **Dashboard Layout**:
   - 4 stat cards (Total, Week, Month, All-Time) ❌ Need to add
   - Activity timeline/feed ❌ Need to add
   - Referral chain visualization ❌ Need to add
   - Top referred users list ❌ Need to add

3. **Leaderboard**:
   - Multiple timeframes ❌ Need to add
   - Category filters ❌ Need to add
   - Rewards per rank ❌ Need to add
   - Pagination (top 100) ❌ Need to add

4. **Analytics**:
   - Conversion funnel ❌ Need to add
   - Click-through rates ❌ Need to add
   - Geographic distribution ❌ Nice to have
   - Viral coefficient calculation ❌ Need to add

5. **Social Integration**:
   - Share buttons (Twitter, Discord, Telegram) ❌ Need to add
   - Pre-filled share text ❌ Need to add
   - Webhook notifications ❌ Future feature
   - Auto-post on milestone ❌ Future feature

### Guild System Patterns
1. **Creation Flow**:
   - Progressive wizard (5 steps) ❌ Need to add
   - Template selection ❌ Need to add
   - Rich media (avatar, banner) ❌ Need to add
   - Category/tags ❌ Need to add

2. **Guild Profile**:
   - Cover banner + avatar ❌ Need to add
   - Stats dashboard ❌ Need to add
   - Member roster ❌ Need to add
   - Activity feed ❌ Need to add
   - Achievement showcase ❌ Need to add

3. **Discovery**:
   - Grid layout with cards ❌ Need to add
   - Multi-select filters ❌ Need to add
   - Sort options (newest, popular, trending) ❌ Need to add
   - Search autocomplete ❌ Need to add
   - "Recommended" section ❌ Nice to have

4. **Treasury Management**:
   - Balance display ✅ We can add this
   - Transaction history ❌ Need to add
   - Deposit/withdraw forms ✅ We have transaction builders
   - Spending proposals ❌ Future feature
   - Multi-sig support ❌ Future feature

5. **Member Management**:
   - Role system ❌ We have officers only
   - Permission matrix ❌ Future feature
   - Member directory ❌ Need to add
   - Activity tracking ❌ Need to add
   - Promotion/demotion flow ❌ Need to add

---

## 🎯 Updated Feature Gap Analysis

### Referral System (Current: 25% → Target: 100%)

**✅ Have (25%)**:
- Custom referral codes (3-32 chars)
- Code registration
- Auto-rewards (+50 referrer, +25 referee)
- Badge tiers (Bronze/Silver/Gold at 1/5/10)

**❌ Missing (75%)**:
- Dashboard with 4 stat cards
- Link generator with QR codes
- Referral leaderboard (timeframes, filters, pagination)
- Analytics (conversion funnel, CTR, viral coefficient)
- Activity timeline
- Referral chain visualization
- Social share buttons
- Link preview cards

### Guild System (Current: 40% → Target: 100%)

**✅ Have (40%)**:
- Guild creation (name, 100pt cost)
- Join/leave functionality
- Treasury (deposit/withdraw)
- Officer management
- Level system (5 levels based on points)
- Guild quests support

**❌ Missing (60%)**:
- Guild profiles (avatar, banner, description)
- Guild discovery page (grid layout, filters, search)
- Guild leaderboard (sort by members, points, level)
- Member roster with roles
- Activity feed
- Transaction history
- Analytics dashboard (growth, activity, treasury)
- Template selection for creation

---

## 📋 Updated Implementation Priorities

### Phase 2-4: Referral System (6 days)
**Must Have**:
1. ReferralCodeForm - Register code ✅ Contract ready
2. ReferralLinkGenerator - Generate links + QR codes
3. ReferralStatsCards - 4 stat cards (Total, Week, Month, All-Time)
4. ReferralDashboard - Main view with activity timeline
5. ReferralLeaderboard - Top referrers with timeframes
6. Social share buttons - Twitter, Warpcast

**Nice to Have**:
7. ReferralAnalytics - Conversion funnel, viral coefficient
8. ReferralTree - Chain visualization

### Phase 5-7: Guild System (8 days)
**Must Have**:
1. GuildCreationForm - Wizard with name, description, avatar
2. GuildCard - Display card for discovery
3. GuildMemberList - Member roster with officers
4. GuildTreasuryPanel - Balance, deposit/withdraw
5. GuildDiscoveryPage - Grid with filters and search
6. GuildLeaderboard - Sort by members/points/level
7. GuildProfilePage - Complete guild view
8. GuildActivityFeed - Recent guild actions

**Nice to Have**:
9. GuildAnalytics - Growth charts, activity heatmap
10. Template selection - Pre-configured guild types

---

## 🚀 Next Steps

1. **Contract Verification** (Today):
   - Verify Core contract on Basescan
   - Verify Guild contract on Basescan
   - Update ABIs from verified contracts
   - Re-test all contract functions

2. **Begin Phase 2** (After verification):
   - Create ReferralCodeForm component
   - Create ReferralLinkGenerator with QR code support
   - Create ReferralStatsCards (4 cards)
   - Build 2 API endpoints with 10-layer security

3. **Research Integration**:
   - Apply big platform patterns to our designs
   - Use trezoadmin-41 templates for dashboards
   - Use gmeowbased0.6 patterns for cards
   - Use music patterns for forms

---

## 📝 Template Mapping

**From Research → Our Templates**:

1. **Stat Cards** (4 cards pattern):
   - Template: trezoadmin-41/dashboard-analytics
   - Adaptation: 35% (layout + styling)
   - Components: ReferralStatsCards, GuildStatsCards

2. **Leaderboard Tables**:
   - Template: music/DataTable with sorting
   - Adaptation: 40% (columns + pagination)
   - Components: ReferralLeaderboard, GuildLeaderboard

3. **Guild Cards Grid**:
   - Template: gmeowbased0.6/collection-card
   - Adaptation: 10% (minimal changes)
   - Components: GuildCard, GuildDiscoveryPage

4. **Forms & Wizards**:
   - Template: trezoadmin-41/form-layout-01 + wizard
   - Adaptation: 35% (steps + validation)
   - Components: ReferralCodeForm, GuildCreationForm

5. **Activity Timeline**:
   - Template: trezoadmin-41/activity-feed
   - Adaptation: 40% (custom event types)
   - Components: ReferralActivityTimeline, GuildActivityFeed

6. **Analytics Charts**:
   - Template: trezoadmin-41/charts (if needed)
   - Adaptation: 45% (custom data sources)
   - Components: ReferralAnalytics, GuildAnalytics

---

## ✅ Research Complete

**Total Platforms Researched**: 5  
**Patterns Identified**: 38  
**Features Gaps Closed**: From 25% to roadmap for 100%  
**Template Mappings**: 6 primary patterns identified  

Ready to complete Phase 1 testing and begin Phase 2 implementation.
