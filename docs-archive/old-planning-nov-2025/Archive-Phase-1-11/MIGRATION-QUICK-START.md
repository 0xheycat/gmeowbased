# Template Migration - Quick Start Guide

**Date**: November 26, 2025  
**Template**: Tailwick v2.0 - Nextjs-TS  
**Estimated Time**: 6-9 weeks

---

## 🚀 Getting Started (Day 1)

### Prerequisites

✅ Node.js >= 22.21.1  
✅ npm or pnpm installed  
✅ Git access to repository  
✅ Vercel account (for preview deployments)  
✅ Template files in `planning/template/`

### Step 1: Backup Current Code

```bash
# Create backup directory
mkdir -p backups/pre-migration-$(date +%Y%m%d)

# Backup critical directories
cp -r app/ backups/pre-migration-$(date +%Y%m%d)/
cp -r components/ backups/pre-migration-$(date +%Y%m%d)/
cp -r lib/ backups/pre-migration-$(date +%Y%m%d)/
cp -r contract/ backups/pre-migration-$(date +%Y%m%d)/
cp package.json backups/pre-migration-$(date +%Y%m%d)/
cp tailwind.config.ts backups/pre-migration-$(date +%Y%m%d)/

echo "✅ Backup complete: backups/pre-migration-$(date +%Y%m%d)/"
```

### Step 2: Create Migration Branch

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create new branch
git checkout -b template-migration-tailwick

# Confirm branch created
git branch
```

### Step 3: Analyze Current Structure

```bash
# Count files to migrate
echo "=== Current Structure ==="
find app/ -name "*.tsx" -o -name "*.ts" | wc -l
find components/ -name "*.tsx" -o -name "*.ts" | wc -l
find lib/ -name "*.ts" | wc -l

# Identify CSS files to replace
echo "=== CSS Files to Replace ==="
find . -name "*.css" -not -path "./node_modules/*"

# Size of API routes (preserve)
echo "=== API Routes (PRESERVE) ==="
du -sh app/api/
```

---

## 📦 Phase 1: Foundation Setup (Week 1)

### Day 1-2: Install Template Structure

```bash
# Navigate to project root
cd /home/heycat/Desktop/2025/Gmeowbased

# Create temporary directory for template
mkdir -p temp-template

# Extract Tailwick template
cp -r "planning/template/Tailwick v2.0 HTML/Nextjs-TS/"* temp-template/

# Review template structure
ls -la temp-template/src/
```

### Day 2-3: Merge Dependencies

Create `migration-scripts/merge-package-json.js`:

```javascript
const fs = require('fs')

const current = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const template = JSON.parse(fs.readFileSync('temp-template/package.json', 'utf8'))

// Keep our critical dependencies
const preserve = [
  '@coinbase/onchainkit',
  '@farcaster/miniapp-sdk',
  '@farcaster/miniapp-core',
  '@farcaster/miniapp-wagmi-connector',
  '@neynar/nodejs-sdk',
  '@neynar/react',
  'wagmi',
  'viem',
  '@supabase/supabase-js',
  '@sentry/nextjs',
  '@tanstack/react-query',
  'ethers',
]

// Merge dependencies
const merged = {
  ...current,
  dependencies: {
    ...template.dependencies,
    ...Object.fromEntries(
      Object.entries(current.dependencies)
        .filter(([key]) => preserve.includes(key))
    ),
    // Update Next.js, React, Tailwind from template
    'next': template.dependencies.next,
    'react': template.dependencies.react,
    'react-dom': template.dependencies['react-dom'],
    'tailwindcss': template.dependencies.tailwindcss,
  },
  devDependencies: {
    ...current.devDependencies,
    ...template.devDependencies,
  },
}

fs.writeFileSync('package.json.merged', JSON.stringify(merged, null, 2))
console.log('✅ Merged package.json created: package.json.merged')
console.log('Review and then: mv package.json.merged package.json')
```

Run it:
```bash
node migration-scripts/merge-package-json.js
# Review differences
diff package.json package.json.merged
# Apply if looks good
mv package.json.merged package.json
```

### Day 3-4: Install New Dependencies

```bash
# Clean install
rm -rf node_modules
rm package-lock.json

# Install
npm install

# Verify no conflicts
npm list next react tailwindcss

# Should show:
# next@15.5.3
# react@19.1.0
# tailwindcss@4.1.13
```

### Day 4-5: Setup New Directory Structure

```bash
# Create new src/ directory
mkdir -p src

# Copy Tailwick structure
cp -r temp-template/src/app src/
cp -r temp-template/src/components src/
cp -r temp-template/src/assets src/
cp -r temp-template/src/helpers src/
cp -r temp-template/src/types src/
cp -r temp-template/src/utils src/

# Preserve our code
mkdir -p src/app/api-preserved
cp -r app/api/* src/app/api-preserved/

mkdir -p src/lib-preserved
cp -r lib/* src/lib-preserved/

mkdir -p src/contract-preserved
cp -r contract/* src/contract-preserved/
```

---

## 🎨 Phase 2: Layout Migration (Week 2)

### Day 1: Root Layout

Create `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import '@/app/globals.css'
import { MiniAppProvider } from './providers'
import { GmeowLayout } from '@/components/layouts/GmeowLayout'
import NextTopLoader from 'nextjs-toploader'

// Gmeow custom font
const gmeowFont = localFont({
  src: [
    { path: './fonts/gmeow.woff2', weight: '400', style: 'normal' },
    { path: './fonts/gmeow.woff', weight: '400', style: 'normal' },
  ],
  variable: '--font-gmeow',
  display: 'swap',
})

const baseUrl = process.env.MAIN_URL || 'https://gmeowhq.art'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

// Farcaster Frame metadata
const gmFrame = {
  version: 'next',
  imageUrl: `${baseUrl}/frame-image.png`,
  button: {
    title: '🎮 Launch Game',
    action: {
      type: 'launch_frame',
      name: 'Gmeowbased Adventure',
      url: baseUrl,
      splashImageUrl: `${baseUrl}/splash.png`,
      splashBackgroundColor: '#000000',
    },
  },
}

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Gmeowbased — Multi-Chain Quest Game',
  description: 'Join the epic Gmeowbased! Daily GM rituals, cross-chain quests, guild battles.',
  openGraph: {
    title: 'Gmeowbased — Multi-Chain Quest Game',
    description: 'Begin your Gmeowbased! Conquer daily GM streaks, complete quests.',
    images: [{ url: `${baseUrl}/logo.png`, width: 1024, height: 1024 }],
  },
  other: {
    'fc:frame': JSON.stringify(gmFrame),
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={gmeowFont.variable}>
      <body className="min-h-screen">
        <NextTopLoader color="#8B5CF6" showSpinner={false} />
        <MiniAppProvider>
          <GmeowLayout>{children}</GmeowLayout>
        </MiniAppProvider>
      </body>
    </html>
  )
}
```

### Day 2: Miniapp Layout

Create `src/components/layouts/miniapp/MiniappLayout.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { MiniappHeader } from './MiniappHeader'
import { MiniappNavigation } from './MiniappNavigation'
import { MiniappSidebar } from './MiniappSidebar'

export function MiniappLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <MiniappHeader onMenuClick={() => setSidebarOpen(true)} />

      {/* Main Content */}
      <main 
        className="flex-1 pb-20 pt-16" 
        style={{
          paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      <MiniappNavigation />

      {/* Slide-out Sidebar */}
      <MiniappSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  )
}
```

### Day 3: Desktop Layout

Create `src/components/layouts/desktop/DesktopLayout.tsx`:

```tsx
'use client'
import { DesktopHeader } from './DesktopHeader'
import { DesktopSidebar } from './DesktopSidebar'
import { Footer } from '../shared/Footer'

export function DesktopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <DesktopSidebar />

      <div className="flex flex-1 flex-col">
        {/* Header */}
        <DesktopHeader />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}
```

### Day 4: Responsive Wrapper

Create `src/components/layouts/GmeowLayout.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/frame-sdk'
import { MiniappLayout } from './miniapp/MiniappLayout'
import { DesktopLayout } from './desktop/DesktopLayout'

export function GmeowLayout({ children }: { children: React.ReactNode }) {
  const [isMiniapp, setIsMiniapp] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready()
        const inMiniapp = await sdk.isInMiniApp()
        setIsMiniapp(inMiniapp)
      } catch (error) {
        console.log('Not in miniapp')
        setIsMiniapp(false)
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl">🐱</div>
          <p className="mt-4 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (isMiniapp) {
    return <MiniappLayout>{children}</MiniappLayout>
  }

  return <DesktopLayout>{children}</DesktopLayout>
}
```

### Day 5: Test Layouts

```bash
# Start dev server
npm run dev

# Test URLs
open http://localhost:3000
open http://localhost:3000/?miniapp=true  # Simulate miniapp

# Should see:
# ✅ Proper layout based on context
# ✅ Safe area insets working
# ✅ Navigation responsive
```

---

## 🧩 Phase 3: Component Migration (Weeks 3-4)

### Priority 1: Quest Components

Create `migration-scripts/migrate-quest-card.js`:

```javascript
// Helper script to track component migration
const fs = require('fs')

const components = [
  { name: 'QuestCard', status: 'pending', priority: 1 },
  { name: 'QuestList', status: 'pending', priority: 1 },
  { name: 'QuestDetail', status: 'pending', priority: 1 },
  // ... add all components
]

const report = components.map(c => 
  `- [${c.status === 'done' ? 'x' : ' '}] ${c.name} (P${c.priority})`
).join('\n')

fs.writeFileSync('MIGRATION-STATUS.md', `# Component Migration Status\n\n${report}`)
console.log('✅ Status report created: MIGRATION-STATUS.md')
```

### Component Template

Create `src/components/quest/QuestCard.tsx`:

```tsx
'use client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Star, Users } from 'lucide-react'
import type { Quest } from '@/lib-preserved/types'

interface QuestCardProps {
  quest: Quest
  onComplete?: () => void
}

export function QuestCard({ quest, onComplete }: QuestCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{quest.name}</CardTitle>
          <Badge variant={quest.active ? 'default' : 'secondary'}>
            {quest.active ? 'Active' : 'Ended'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          {quest.description}
        </p>
        
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span>{quest.rewardPoints} points</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{quest.completions} / {quest.maxCompletions}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{new Date(quest.expiresAt).toLocaleDateString()}</span>
          </div>
        </div>
        
        {onComplete && quest.active && (
          <Button onClick={onComplete} className="w-full">
            Complete Quest
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## 🎨 Phase 4: Styling (Week 5)

### Update Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gmeow brand colors
        'gmeow-primary': '#8B5CF6',
        'gmeow-secondary': '#0052FF',
        'gmeow-accent': '#FFD700',
        
        // Farcaster colors
        'farcaster-purple': '#8B5CF6',
        
        // Base colors
        'base-blue': '#0052FF',
      },
      fontFamily: {
        gmeow: ['var(--font-gmeow)', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate, forms, typography],
}

export default config
```

---

## 📱 Phase 5: Miniapp Optimization (Week 6)

### Add Farcaster SDK Helpers

Create `src/lib/miniapp/hooks.ts`:

```typescript
'use client'
import { sdk } from '@farcaster/frame-sdk'
import { useEffect, useState } from 'react'

export function useIsMiniapp() {
  const [isInMiniapp, setIsInMiniapp] = useState(false)
  
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready()
        const inMiniapp = await sdk.isInMiniApp()
        setIsInMiniapp(inMiniapp)
      } catch (e) {
        setIsInMiniapp(false)
      }
    }
    init()
  }, [])
  
  return isInMiniapp
}

export function useMiniappContext() {
  const [context, setContext] = useState<any>(null)
  
  useEffect(() => {
    const init = async () => {
      try {
        await sdk.actions.ready()
        const ctx = await sdk.context
        setContext(ctx)
      } catch (e) {
        console.error('Failed to get miniapp context', e)
      }
    }
    init()
  }, [])
  
  return context
}
```

---

## ✅ Daily Checklist

### Every Morning:
- [ ] Pull latest from main: `git pull origin main`
- [ ] Rebase migration branch: `git rebase main`
- [ ] Review migration status: `cat MIGRATION-STATUS.md`
- [ ] Update todo list

### Every Afternoon:
- [ ] Test changes: `npm run dev`
- [ ] Run tests: `npm test`
- [ ] Fix TypeScript errors: `npm run build:ts`
- [ ] Commit progress: `git add . && git commit -m "feat: ..."`

### Every Evening:
- [ ] Push to remote: `git push origin template-migration-tailwick`
- [ ] Update migration status
- [ ] Document blockers
- [ ] Plan next day

---

## 🚨 Common Issues & Solutions

### Issue: TypeScript Errors After Template Copy
```bash
# Solution: Update tsconfig paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/lib-preserved/*": ["./src/lib-preserved/*"]
    }
  }
}
```

### Issue: CSS Not Loading
```bash
# Solution: Check import paths in layout.tsx
import './globals.css'  // ✅ Correct
import '../styles/globals.css'  // ❌ Old path
```

### Issue: API Routes 404
```bash
# Solution: Ensure app/api/ is preserved
cp -r src/app/api-preserved/* src/app/api/
```

### Issue: Wallet Not Connecting
```bash
# Solution: Check Wagmi config preserved
# Verify: src/lib-preserved/wagmi.ts exists
# Update imports if needed
```

---

## 📊 Progress Tracking

Create `MIGRATION-LOG.md` and update daily:

```markdown
# Migration Log

## Week 1: Foundation
- [x] Day 1: Backup & branch
- [x] Day 2: Install template
- [x] Day 3: Merge dependencies
- [x] Day 4: Install packages
- [x] Day 5: Setup structure
- **Status**: ✅ Complete

## Week 2: Layouts
- [x] Day 1: Root layout
- [ ] Day 2: Miniapp layout
- [ ] Day 3: Desktop layout
- [ ] Day 4: Responsive wrapper
- [ ] Day 5: Test layouts
- **Status**: 🟡 In Progress

...
```

---

## 🎯 Success Metrics

Track these daily:

```bash
# TypeScript errors
npx tsc --noEmit | wc -l
# Target: 0

# Components migrated
grep "✅" MIGRATION-STATUS.md | wc -l
# Target: 50+

# Bundle size
npm run build && du -sh .next/
# Target: < 500KB gzipped

# Performance
npm run lighthouse
# Target: 90+ all categories
```

---

## 🆘 Get Help

- **Stuck on component?** Check Tailwick docs + ProKit screenshots
- **TypeScript error?** Review type definitions in `src/types/`
- **Layout broken?** Test with `?miniapp=true` parameter
- **Performance issue?** Run Lighthouse and check bundle size

---

**Ready to start?** Run:

```bash
git checkout -b template-migration-tailwick
bash migration-scripts/01-backup-code.sh
bash migration-scripts/02-install-template.sh
npm run dev
```

Good luck! 🚀
