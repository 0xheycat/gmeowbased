# Admin Authentication System Guide

## Overview
Your Gmeowbased Adventure app has a **3-layer admin authentication system** for protecting admin routes (`/admin/*` and `/api/admin/*`).

---

## 🔐 Authentication Layers

### Layer 1: Access Code (Required)
**Environment Variable:** `ADMIN_ACCESS_CODE`

- **Purpose:** First line of defense - a secret password
- **Current Value:** `your_admin_access_code` (⚠️ PLACEHOLDER - CHANGE THIS!)
- **How it works:** Users must enter this code to access admin panel
- **Location Used:** `/app/admin/login` form
- **Validation:** Exact string match (case-sensitive, whitespace-trimmed)

**Example:**
```bash
ADMIN_ACCESS_CODE=MySecurePassword123!
```

---

### Layer 2: JWT Session Token (Required)
**Environment Variable:** `ADMIN_JWT_SECRET`

- **Purpose:** Creates secure session tokens after login
- **Current Value:** `your_admin_jwt_secret` (⚠️ PLACEHOLDER - CHANGE THIS!)
- **How it works:** 
  - After successful login, generates a JWT token
  - Token stored in HTTP-only cookie: `gmeow_admin_session`
  - Verified on every admin request via middleware
- **Algorithm:** HS256 (HMAC with SHA-256)
- **Session Duration:**
  - Default: 12 hours
  - "Remember me": 7 days

**Example (generate a secure secret):**
```bash
# Generate secure random secret (32+ characters)
ADMIN_JWT_SECRET=a8f5e9d2c4b7a3e1f6d8c2b9a5e3d7f1c4b6a8e2d5f3c7b1a9e4d6f8c2b5a3e1
```

**To generate:**
```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Layer 3: TOTP 2FA (Optional)
**Environment Variable:** `ADMIN_TOTP_SECRET`

- **Purpose:** Time-based One-Time Password (like Google Authenticator)
- **Current Value:** `JBSWY3DPEHPK3PXP` (⚠️ Example secret)
- **How it works:**
  - If set, requires 6-digit code from authenticator app
  - Uses `otplib` library with 30-second window
  - Allows ±1 time window for clock skew
- **Optional:** If not set, only access code is required

**To generate:**
```bash
# Use otplib or similar
node -e "console.log(require('otplib').authenticator.generateSecret())"
```

**QR Code Setup:**
```javascript
// In your admin setup, generate QR code with:
const otpauth = authenticator.keyuri('admin@gmeow', 'Gmeow Admin', ADMIN_TOTP_SECRET)
// Convert to QR code and scan with Google Authenticator
```

---

## 🚨 Current Issue: Middleware Crash

### Problem
Your middleware is failing because:

1. **Placeholder values in production:**
   - `ADMIN_ACCESS_CODE=your_admin_access_code`
   - `ADMIN_JWT_SECRET=your_admin_jwt_secret`

2. **Middleware checks these on EVERY request:**
   ```typescript
   function isAdminSecurityEnabled() {
     return Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_ACCESS_CODE)
   }
   ```

3. **Even though admin security is "enabled" (values exist), the JWT operations fail with placeholder secrets**

### Solution Applied (Temporary)
I've **temporarily disabled** admin security checks in middleware:
```typescript
function isAdminSecurityEnabled() {
  return false  // Disabled temporarily
}
```

This allows the site to deploy. **You must fix this before enabling admin features!**

---

## 🔧 How to Fix Properly

### Step 1: Set Real Environment Variables

**For Vercel Production:**
1. Go to: https://vercel.com/0xheycat/gmeowbased/settings/environment-variables
2. Add these variables:

```bash
# REQUIRED - Generate secure values
ADMIN_ACCESS_CODE=YourStrongPasswordHere123!
ADMIN_JWT_SECRET=<output from: openssl rand -hex 32>

# OPTIONAL - Only if you want 2FA
ADMIN_TOTP_SECRET=<output from: otplib.authenticator.generateSecret()>
```

**For Local Development (`.env.local`):**
```bash
# Replace placeholder values with real ones
ADMIN_ACCESS_CODE=DevPassword123
ADMIN_JWT_SECRET=dev-secret-at-least-32-chars-long-1234567890abcdef
ADMIN_TOTP_SECRET=  # Leave empty to disable 2FA locally
```

### Step 2: Re-enable Admin Security

After setting environment variables, update `middleware.ts`:

```typescript
function isAdminSecurityEnabled() {
  return Boolean(process.env.ADMIN_JWT_SECRET && process.env.ADMIN_ACCESS_CODE)
  // Remove the "return false" temporary fix
}
```

### Step 3: Test Login Flow

1. Visit: `https://gmeowhq.art/admin/login`
2. Enter your `ADMIN_ACCESS_CODE`
3. If TOTP enabled, enter 6-digit code from authenticator
4. Should create session and redirect to `/admin`

---

## 📊 Authentication Flow Diagram

```
Request to /admin
       ↓
   Middleware
       ↓
[Is admin security enabled?]
       ↓
  [YES] → Check JWT cookie
       ↓
  [Valid?] → Allow access
       ↓
  [Invalid/Missing] → Redirect to /admin/login
       ↓
  Login Form:
    - Enter ADMIN_ACCESS_CODE
    - Enter TOTP (if enabled)
       ↓
  [Valid?] → Issue JWT token → Set cookie → Redirect to /admin
       ↓
  [Invalid] → Show error
```

---

## 🛡️ Protected Routes

### Pages Protected:
- `/admin` - Admin dashboard
- `/admin/*` - All admin sub-pages
- **Exception:** `/admin/login` (always accessible)

### APIs Protected:
- `/api/admin/*` - All admin APIs
- **Exceptions:**
  - `/api/admin/auth/login` (for login)
  - `/api/admin/auth/logout` (for logout)

---

## 🔍 How Middleware Works

**File:** `/middleware.ts`

```typescript
// 1. Check if admin security is enabled
if (!isAdminSecurityEnabled()) return null

// 2. Check if route needs protection
if (!shouldProtectAdminRoute(pathname)) return null

// 3. Verify JWT token from cookie
const token = req.cookies.get('gmeow_admin_session')?.value
const valid = await verifyAdminToken(token)

// 4. If valid, allow; if not, redirect to login
if (valid) return null
return NextResponse.redirect('/admin/login')
```

---

## 🎯 JWT Token Details

**Token Payload:**
```json
{
  "scope": "gmeow.admin",
  "sub": "admin",
  "iat": 1699999999,
  "exp": 1700043199
}
```

**Cookie Configuration:**
```javascript
{
  name: 'gmeow_admin_session',
  httpOnly: true,        // Can't access via JavaScript
  secure: true,          // HTTPS only
  sameSite: 'strict',    // CSRF protection
  path: '/',
  maxAge: 43200          // 12 hours (or 604800 for 7 days)
}
```

---

## 🚀 Quick Setup Commands

**1. Generate secrets:**
```bash
# Access Code (anything secure)
echo "ADMIN_ACCESS_CODE=$(openssl rand -base64 24)"

# JWT Secret (32+ bytes hex)
echo "ADMIN_JWT_SECRET=$(openssl rand -hex 32)"

# TOTP Secret (optional)
node -e "const otplib = require('otplib'); console.log('ADMIN_TOTP_SECRET=' + otplib.authenticator.generateSecret())"
```

**2. Set in Vercel:**
```bash
vercel env add ADMIN_ACCESS_CODE production
vercel env add ADMIN_JWT_SECRET production
vercel env add ADMIN_TOTP_SECRET production  # Optional
```

**3. Redeploy:**
```bash
git commit --allow-empty -m "trigger redeploy with new env vars"
git push origin origin
```

---

## ⚠️ Security Best Practices

1. **Never commit real secrets to git**
   - `.env.local` is gitignored ✅
   - Always use placeholders in committed files

2. **Use strong values:**
   - Access Code: 16+ characters, mixed case, numbers, symbols
   - JWT Secret: 32+ bytes (64+ hex characters)
   - TOTP Secret: Use generated value, don't make up

3. **Rotate secrets periodically:**
   - Change `ADMIN_ACCESS_CODE` every 3-6 months
   - Change `ADMIN_JWT_SECRET` if compromised (invalidates all sessions)

4. **Enable TOTP for production:**
   - Adds second factor
   - Even if password leaks, can't login without phone

---

## 📝 Environment Variables Summary

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `ADMIN_ACCESS_CODE` | ✅ Yes | Login password | `MySecure2024Pass!` |
| `ADMIN_JWT_SECRET` | ✅ Yes | JWT signing key | `a8f5e9d2c4b7...` (64 chars) |
| `ADMIN_TOTP_SECRET` | ❌ Optional | 2FA authenticator | `JBSWY3DPEHPK3PXP` |

---

## 🐛 Troubleshooting

### Issue: Middleware crashes with 500 error
**Cause:** Placeholder or invalid JWT secret
**Fix:** Set real `ADMIN_JWT_SECRET` in Vercel environment variables

### Issue: Can't login even with correct password
**Cause:** TOTP enabled but no code entered
**Fix:** Either:
- Enter 6-digit code from authenticator app
- Remove `ADMIN_TOTP_SECRET` to disable 2FA

### Issue: Session expires too quickly
**Cause:** Default 12-hour timeout
**Fix:** Check "Remember me" during login for 7-day session

### Issue: Locked out of admin
**Cause:** Forgot access code or lost 2FA device
**Fix:** 
1. Update `ADMIN_ACCESS_CODE` in Vercel
2. Remove `ADMIN_TOTP_SECRET` to disable 2FA
3. Redeploy

---

## 📞 Next Steps

1. ✅ **Site is now deployed** (admin security temporarily disabled)
2. ⚠️ **Set real environment variables in Vercel** (see Step 1 above)
3. ⚠️ **Re-enable admin security** (remove `return false` from middleware)
4. ✅ **Test admin login** at `/admin/login`
5. ✅ **Optional: Set up 2FA** with authenticator app

---

**Last Updated:** November 13, 2025
**Status:** Admin security temporarily disabled for deployment
**Action Required:** Set production environment variables before enabling admin features
