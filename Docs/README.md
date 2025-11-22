# Gmeowbased Documentation

**Project**: Gmeowbased Frame System  
**Last Updated**: December 2024

---

## 📁 Documentation Structure

```
Docs/
├── README.md (this file)
├── MainGoal.md (Project roadmap & phase overview)
├── CHANGELOG.md (All changes across phases)
└── Maintenance/
    └── frame/
        ├── 2024-12/ (Current month's work)
        ├── archives/ (Historical docs: Phase 0-5, 58+ documents)
        │   ├── README.md (Archive navigation guide)
        │   ├── phase-0/ (Initial frame system)
        │   ├── nov-2025/ (Phase 4 docs, 40+ files)
        │   ├── stage-5/ (Phase 5 stage docs)
        │   ├── onboarding/ (Onboarding implementation)
        │   ├── frame-fixes/ (Frame debugging & fixes)
        │   └── history/ (Historical tracking)
        ├── Phase-1/
        │   ├── Phase-1A/ (Cache optimization - COMPLETE)
        │   ├── Phase-1B/ (Session state - COMPLETE)
        │   └── Phase-1B1/ (Interactive buttons - IN PROGRESS)
        ├── Phase-2/ (Future: Advanced features)
        └── Phase-3/ (Future: Scaling)

docs/maintenance/ (Original documentation location)
└── FRAME-IMPROVEMENT-ANALYSIS-2025-11-22.md (Master planning doc, 3135 lines)
```

---

## 🎯 Current Phase: 1B.1 - Interactive Frame Buttons

**Status**: 🔄 Pre-Implementation Audit  
**Goal**: Add interactive POST action buttons to all 9 frame types  
**Start Date**: December 2024  
**Expected Completion**: Before Phase 1C

### Phase 1B.1 Documents
- [System Architecture Audit](./Maintenance/frame/Phase-1/Phase-1B1/SYSTEM-AUDIT.md) - Complete system analysis before implementation
- [Implementation Plan](./Maintenance/frame/Phase-1/Phase-1B1/IMPLEMENTATION-PLAN.md) - Detailed button specifications (pending)
- [Testing Guide](./Maintenance/frame/Phase-1/Phase-1B1/TESTING-GUIDE.md) - Local & production testing (pending)

## 🚀 Getting Started

### For Developers New to This Project
1. **Start Here**: Read [MainGoal.md](./MainGoal.md) for the complete project vision and roadmap
2. **Current Work**: Review [Phase 1B.1 System Audit](./Maintenance/frame/Phase-1/Phase-1B1/SYSTEM-AUDIT.md)
3. **Master Plan**: Check [FRAME-IMPROVEMENT-ANALYSIS](../docs/maintenance/FRAME-IMPROVEMENT-ANALYSIS-2025-11-22.md) for comprehensive roadmap (3135 lines)
4. **Historical Context**: Browse [archives/](./Maintenance/frame/archives/) for Phase 0-5 work (58+ documents)

### Quick Links
- **Current Phase**: Phase 1B.1 - Pre-implementation audit
- **Status**: 🔄 System analysis complete, implementation planning next
- **Priority**: Complete audit before expanding to all frame types

---

## ✅ Completed Phases

### Phase 1A - Redis Cache Optimization (COMPLETE)
**Location**: `./Maintenance/frame/Phase-1/Phase-1A/`

**Achievements**:
- ✅ 97.9% performance improvement
- ✅ Redis integration with Upstash
- ✅ Production deployment verified

**Documents**:
- [Completion Report](./Maintenance/frame/Phase-1/Phase-1A/COMPLETION-REPORT.md)

### Phase 1B - Session State Management (COMPLETE)
**Location**: `./Maintenance/frame/Phase-1/Phase-1B/`

**Achievements**:
- ✅ `frame_sessions` table with 4 indexes, 2 functions
- ✅ `recordGM` and `questProgress` actions operational
- ✅ Session persistence verified in production (<600ms response times)

**Documents**:
- [Implementation Summary](./Maintenance/frame/Phase-1/Phase-1B/IMPLEMENTATION-SUMMARY.md)
- [Deployment Guide](./Maintenance/frame/Phase-1/Phase-1B/DEPLOYMENT-GUIDE.md)
- [Completion Certificate](./Maintenance/frame/Phase-1/Phase-1B/COMPLETION-CERTIFICATE.md)

---

## 🔮 Upcoming Phases

### Phase 1C - TBD
**Dependencies**: Phase 1B.1 must reach 100% completion

### Phase 2 - Advanced Features
**Status**: Planning stage

### Phase 3 - Scaling & Optimization
**Status**: Future roadmap

---

## 📚 Quick Reference

### Frame Types (9 operational)
1. **gm** - Daily GM ritual
2. **quest** - Quest completion
3. **onchainstats** - Contract stats
4. **badge** - Badge minting
5. **leaderboards** - Ranking display
6. **guild** - Guild management
7. **verify** - Quest verification
8. **points** - Points economy
9. **referral** - Referral system

### Key Technologies
- **Framework**: Next.js 14 App Router
- **Database**: Supabase PostgreSQL
- **Cache**: Redis (Upstash)
- **Blockchain**: Base, Unichain, Celo, Ink, OP
- **Social**: Farcaster vNext frames
- **API**: Neynar for social verification

---

## 🚀 Development Workflow

### Before Code Changes
1. ✅ Read system audit documentation
2. ✅ Understand existing architecture
3. ✅ Review GI 13 Safe Patching Rules
4. ✅ Test locally on `localhost:3000`
5. ❌ **DO NOT** create new files without approval

### Deployment Process
1. Commit changes to GitHub
2. Wait 4-5 minutes for Vercel build
3. Check Vercel logs for errors
4. Test on production (gmeowbased.com)
5. Verify frame_sessions table updates

### MCP Tools Available
- **Supabase**: Database management
- **Neynar**: Farcaster API integration
- **Coinbase**: Web3 documentation
- **GitHub**: Repository management
- **Playwright**: E2E testing

---

## 📊 Project Health

### Current Metrics
- **Performance**: 97.9% improvement (Phase 1A)
- **Uptime**: 100% (production)
- **Response Time**: <600ms (frame actions)
- **Session Storage**: Operational with 24hr TTL

### Known Issues
- None (Phase 1A & 1B complete)

---

## 📝 Contributing

### Documentation Standards
- Use markdown for all docs
- Include code examples with syntax highlighting
- Add tables for structured data
- Link related documents
- Update CHANGELOG.md for all changes

### Naming Conventions
- Phases: `Phase-[Number]` (e.g., Phase-1, Phase-2)
- Subphases: `Phase-[Number][Letter]` (e.g., Phase-1A, Phase-1B1)
- Documents: `UPPERCASE-WITH-HYPHENS.md`
- Folders: `lowercase-with-hyphens/`

---

## 🔗 External Resources

- [Farcaster Frame Spec](https://docs.farcaster.xyz/reference/frames/spec)
- [Neynar API Docs](https://docs.neynar.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Last Review**: December 2024  
**Next Review**: Before Phase 1C deployment
