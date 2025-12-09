# SEO Optimization Plan

**Date**: December 7, 2025  
**Goal**: Implement comprehensive SEO strategy for improved discoverability  
**Target**: All public pages (landing, profile, quest, guild, leaderboard)

---

## Current SEO Status

### Existing Implementation
- ✅ Basic Next.js metadata
- ❌ No OpenGraph tags
- ❌ No Twitter cards
- ❌ No meta descriptions
- ❌ No sitemap.xml
- ❌ No robots.txt
- ❌ No structured data (JSON-LD)

### Target SEO Score
- **Google Lighthouse SEO**: 95+ (currently ~60)
- **Meta tags**: Complete on all pages
- **Sitemap coverage**: 100% of public pages
- **Structured data**: All major page types

---

## Implementation Strategy

### 1. Global Metadata (app/layout.tsx)

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://gmeowhq.art'),
  title: {
    default: 'GMeowbased - Quest & Guild Platform on Base',
    template: '%s | GMeowbased'
  },
  description: 'Complete quests, earn badges, join guilds, and climb the leaderboard. The premier social quest platform built on Base.',
  keywords: ['Base', 'Quest', 'Guild', 'Web3', 'Farcaster', 'NFT', 'Badges', 'Leaderboard', 'Social'],
  authors: [{ name: 'GMeowbased Team' }],
  creator: 'GMeowbased',
  publisher: 'GMeowbased',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gmeowhq.art',
    siteName: 'GMeowbased',
    title: 'GMeowbased - Quest & Guild Platform on Base',
    description: 'Complete quests, earn badges, join guilds, and climb the leaderboard.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GMeowbased - Quest & Guild Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GMeowbased - Quest & Guild Platform on Base',
    description: 'Complete quests, earn badges, join guilds, and climb the leaderboard.',
    images: ['/twitter-image.png'],
    creator: '@gmeowbased',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}
```

---

### 2. Page-Specific Metadata

#### Profile Page (app/profile/[fid]/page.tsx)

```typescript
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { fid: string } }): Promise<Metadata> {
  const fid = params.fid
  
  try {
    // Fetch profile data
    const response = await fetch(`https://gmeowhq.art/api/user/profile/${fid}`, {
      next: { revalidate: 60 }
    })
    const profile = await response.json()

    const displayName = profile.display_name || `User ${fid}`
    const bio = profile.bio || `View ${displayName}'s profile, quests, and badges on GMeowbased.`
    const avatarUrl = profile.avatar_url || '/default-avatar.png'

    return {
      title: `${displayName}'s Profile`,
      description: bio.slice(0, 160),
      openGraph: {
        title: `${displayName} on GMeowbased`,
        description: bio.slice(0, 200),
        url: `https://gmeowhq.art/profile/${fid}`,
        type: 'profile',
        images: [
          {
            url: avatarUrl,
            width: 400,
            height: 400,
            alt: `${displayName}'s avatar`,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title: `${displayName} on GMeowbased`,
        description: bio.slice(0, 200),
        images: [avatarUrl],
      },
      alternates: {
        canonical: `https://gmeowhq.art/profile/${fid}`,
      },
    }
  } catch {
    return {
      title: `Profile ${fid}`,
      description: 'View this user\'s profile on GMeowbased',
    }
  }
}
```

#### Guild Page (app/guild/[guildId]/page.tsx)

```typescript
export async function generateMetadata({ params }: { params: { guildId: string } }): Promise<Metadata> {
  const guildId = params.guildId
  
  try {
    const response = await fetch(`https://gmeowhq.art/api/guild/${guildId}`, {
      next: { revalidate: 120 }
    })
    const guild = await response.json()

    const name = guild.name || `Guild #${guildId}`
    const description = guild.bio || `Join ${name} on GMeowbased. ${guild.member_count} members, ${guild.total_points} points.`

    return {
      title: `${name} - Guild`,
      description: description.slice(0, 160),
      openGraph: {
        title: `${name} on GMeowbased`,
        description: description.slice(0, 200),
        url: `https://gmeowhq.art/guild/${guildId}`,
        type: 'website',
        images: [
          {
            url: guild.pfp || '/guild-default.png',
            width: 800,
            height: 800,
            alt: `${name} guild logo`,
          },
        ],
      },
      twitter: {
        card: 'summary',
        title: `${name} on GMeowbased`,
        description: description.slice(0, 200),
        images: [guild.pfp || '/guild-default.png'],
      },
      alternates: {
        canonical: `https://gmeowhq.art/guild/${guildId}`,
      },
    }
  } catch {
    return {
      title: `Guild ${guildId}`,
      description: 'View this guild on GMeowbased',
    }
  }
}
```

#### Quest Page (app/quests/[slug]/page.tsx)

```typescript
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const slug = params.slug
  
  try {
    const response = await fetch(`https://gmeowhq.art/api/quests/${slug}`, {
      next: { revalidate: 300 }
    })
    const quest = await response.json()

    const title = quest.title || 'Quest'
    const description = quest.description || `Complete this quest on GMeowbased to earn ${quest.xp_reward} XP and ${quest.points_reward} points.`

    return {
      title: `${title} - Quest`,
      description: description.slice(0, 160),
      openGraph: {
        title: `${title} on GMeowbased`,
        description: description.slice(0, 200),
        url: `https://gmeowhq.art/quests/${slug}`,
        type: 'website',
        images: [
          {
            url: quest.image_url || '/quest-default.png',
            width: 1200,
            height: 630,
            alt: `${title} quest`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} on GMeowbased`,
        description: description.slice(0, 200),
        images: [quest.image_url || '/quest-default.png'],
      },
      alternates: {
        canonical: `https://gmeowhq.art/quests/${slug}`,
      },
    }
  } catch {
    return {
      title: `Quest ${slug}`,
      description: 'View this quest on GMeowbased',
    }
  }
}
```

---

### 3. Structured Data (JSON-LD)

#### Website Schema (app/layout.tsx)

```typescript
// Add to <head> in root layout
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'GMeowbased',
  description: 'Quest & Guild Platform on Base',
  url: 'https://gmeowhq.art',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://gmeowhq.art/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

#### Profile Schema (app/profile/[fid]/page.tsx)

```typescript
const profileSchema = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  mainEntity: {
    '@type': 'Person',
    name: profile.display_name,
    description: profile.bio,
    image: profile.avatar_url,
    sameAs: [
      profile.twitter_url,
      profile.github_url,
      profile.website_url,
    ].filter(Boolean),
  },
}
```

#### Organization Schema (app/guild/[guildId]/page.tsx)

```typescript
const guildSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: guild.name,
  description: guild.bio,
  logo: guild.pfp,
  url: `https://gmeowhq.art/guild/${guildId}`,
  foundingDate: guild.created_at,
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    value: guild.member_count,
  },
}
```

---

### 4. Sitemap Generation (app/sitemap.ts)

```typescript
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://gmeowhq.art'

  // Static pages
  const staticPages = [
    '',
    '/dashboard',
    '/quests',
    '/guild',
    '/leaderboard',
    '/referral',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // Dynamic profile pages (top 100 users)
  const profilesResponse = await fetch(`${baseUrl}/api/leaderboard?limit=100`)
  const profiles = await profilesResponse.json()
  const profilePages = profiles.map((user: any) => ({
    url: `${baseUrl}/profile/${user.farcaster_fid}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Dynamic guild pages (all guilds)
  const guildsResponse = await fetch(`${baseUrl}/api/guild/list?limit=100`)
  const guilds = await guildsResponse.json()
  const guildPages = guilds.map((guild: any) => ({
    url: `${baseUrl}/guild/${guild.guild_id}`,
    lastModified: new Date(guild.updated_at || guild.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Dynamic quest pages (active quests)
  const questsResponse = await fetch(`${baseUrl}/api/quests?status=active&limit=100`)
  const quests = await questsResponse.json()
  const questPages = quests.map((quest: any) => ({
    url: `${baseUrl}/quests/${quest.slug}`,
    lastModified: new Date(quest.updated_at || quest.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...profilePages, ...guildPages, ...questPages]
}
```

---

### 5. Robots.txt (public/robots.txt)

```
# robots.txt for GMeowbased
# https://gmeowhq.art/robots.txt

User-agent: *
Allow: /
Allow: /dashboard
Allow: /quests
Allow: /guild
Allow: /leaderboard
Allow: /referral
Allow: /profile/
Allow: /guild/
Allow: /quests/

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /private/

# Sitemap
Sitemap: https://gmeowhq.art/sitemap.xml
```

---

### 6. Canonical URLs

Add to all page metadata:

```typescript
alternates: {
  canonical: `https://gmeowhq.art${currentPath}`,
},
```

---

## Implementation Checklist

### Week 1: Core SEO
- [ ] Update app/layout.tsx with global metadata
- [ ] Add OpenGraph image (/public/og-image.png - 1200x630px)
- [ ] Add Twitter image (/public/twitter-image.png - 1200x630px)
- [ ] Create robots.txt
- [ ] Create sitemap.ts
- [ ] Test with Google Rich Results Test

### Week 2: Page-Specific SEO
- [ ] Add metadata to profile/[fid]/page.tsx
- [ ] Add metadata to guild/[guildId]/page.tsx
- [ ] Add metadata to quests/[slug]/page.tsx
- [ ] Add metadata to leaderboard page
- [ ] Add canonical URLs to all pages
- [ ] Test with Facebook Sharing Debugger

### Week 3: Structured Data
- [ ] Add Website schema to root layout
- [ ] Add ProfilePage schema to profile pages
- [ ] Add Organization schema to guild pages
- [ ] Add Event schema to quest pages
- [ ] Test with Google Rich Results Test
- [ ] Monitor Google Search Console

---

## Success Metrics

**Google Lighthouse SEO Score**:
- Before: ~60
- Target: 95+ ✅

**Meta Tag Coverage**:
- Title: 100% ✅
- Description: 100% ✅
- OpenGraph: 100% ✅
- Twitter Cards: 100% ✅

**Sitemap Coverage**:
- Static pages: 6/6 ✅
- Dynamic pages: 300+ ✅
- Update frequency: Daily ✅

**Structured Data**:
- Website schema: ✅
- ProfilePage schema: ✅
- Organization schema: ✅
- Event schema: ✅

---

## Testing Tools

1. **Google Lighthouse** - Run in Chrome DevTools
2. **Google Rich Results Test** - https://search.google.com/test/rich-results
3. **Facebook Sharing Debugger** - https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator** - https://cards-dev.twitter.com/validator
5. **Schema.org Validator** - https://validator.schema.org/
