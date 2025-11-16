# Phase 5.8 Environment Variables Checklist 🔐

**⚠️ SECURITY NOTE**: This document lists required environment variables but does NOT include actual secret values.

---

## ✅ Required Environment Variables

### **Neynar Webhooks**
```bash
# Main bot webhook (for cast.created, miniapp events)
NEYNAR_WEBHOOK_SECRET=<your-bot-webhook-secret>

# Viral bonus webhook (for cast.engagement.updated)
NEYNAR_WEBHOOK_SECRET_VIRAL=<your-viral-webhook-secret>
```

**Where to find**:
- Go to https://dev.neynar.com/webhooks
- View your webhook details
- Copy the secret shown

---

### **Neynar API Keys**
```bash
NEYNAR_API_KEY=<your-api-key>
NEXT_PUBLIC_NEYNAR_API_KEY=<your-api-key>
```

---

### **Supabase**
```bash
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ANON_KEY=<your-anon-key>
```

**Where to find**:
- https://supabase.com/dashboard/project/<project-id>/settings/api

---

### **Contract Addresses** (Public - OK to expose)
```bash
# GM Contracts
NEXT_PUBLIC_GM_BASE_ADDRESS=0x...
NEXT_PUBLIC_GM_UNICHAIN_ADDRESS=0x...
NEXT_PUBLIC_GM_CELO_ADDRESS=0x...
NEXT_PUBLIC_GM_INK_ADDRESS=0x...
NEXT_PUBLIC_GM_OP_ADDRESS=0x...

# Badge Contracts
BADGE_CONTRACT_BASE=0x...
BADGE_CONTRACT_UNICHAIN=0x...
BADGE_CONTRACT_CELO=0x...
BADGE_CONTRACT_INK=0x...
BADGE_CONTRACT_OP=0x...
```

---

## 🔒 Security Best Practices

1. **Never commit `.env.local` to git**
   ```bash
   # Add to .gitignore (already done):
   .env.local
   .env*.local
   ```

2. **Never expose secrets in documentation**
   - Use `<redacted>` or `<your-secret-here>` placeholders
   - Only expose public contract addresses

3. **Rotate secrets if exposed**
   - Regenerate in Neynar dashboard
   - Update in `.env.local`
   - Redeploy

---

## ✅ Verification

Check your `.env.local` has these variables:
```bash
# DO NOT RUN IN PUBLIC - Only on your local machine
grep "NEYNAR_WEBHOOK_SECRET_VIRAL" .env.local
grep "SUPABASE_URL" .env.local
```

---

## 🚀 Next Steps

1. Ensure all secrets are in `.env.local` (not committed to git)
2. Apply database migration: `npx supabase db push`
3. Test viral bonus system

**Questions?** Check `/docs/phase/PHASE5.8-IMPLEMENTATION.md`
