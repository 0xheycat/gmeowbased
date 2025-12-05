# 🎨 Icon System Documentation

**Last Updated**: January 19, 2025  
**Total Icons**: 525+ custom SVG icons  
**Organization**: Category-based structure with index exports  
**Template Sources**: Music (1,980 icons), Jumbo-7.4, Trezoadmin-41, Gmeowbased0.6/0.7

---

## 📁 Icon Folder Structure

```
components/icons/
├── action/              # User actions (check, close, copy, upload, refresh)
│   └── index.ts         # Centralized exports
├── blockchain/          # Crypto icons (bitcoin, ethereum, usdc, etc.)
│   └── index.ts
├── navigation/          # Navigation (home, search, filter, compass)
│   └── index.ts
├── layout/              # Layout controls (grid, align, layout modes)
│   └── index.ts
├── ui/                  # Status & feedback (info, warning, star, trophy)
│   └── index.ts
├── brands/              # Social media (twitter, github, instagram, etc.)
│   └── index.ts
├── material/            # Material Design icons (20 core icons)
│   └── index.ts
├── assets/              # Gmeow brand assets
│   ├── gmeow-icons/
│   └── gmeow-illustrations/
└── [root icons]         # Uncategorized (to be migrated)
```

---

## 🔍 How to Check for Existing Icons

### **CRITICAL: Always check before creating new icons!**

**Step 1: Search by category**
```bash
# Check specific category
ls components/icons/action/
ls components/icons/blockchain/
ls components/icons/navigation/

# Search all categories
find components/icons -name "*search*" -o -name "*filter*"
```

**Step 2: Search root folder (uncategorized icons)**
```bash
ls components/icons/ | grep -i "arrow"
ls components/icons/ | grep -i "user"
```

**Step 3: Check template library (1,980+ icons available)**
```bash
# Music template (Material Design)
ls planning/template/music/common/resources/client/icons/material/ | grep "Arrow"

# Gmeowbased0.6 template
ls planning/template/gmeowbased0.6/src/components/icons/
```

**Step 4: Verify import path**
```typescript
// ✅ CORRECT - Category import
import { SearchIcon } from '@/components/icons/navigation';
import { CheckIcon } from '@/components/icons/action';

// ✅ CORRECT - Direct import (if not in category yet)
import { ClockIcon } from '@/components/icons/clock';

// ❌ WRONG - External library (we removed these!)
import { Search } from 'lucide-react';
```

---

## 📦 Available Icon Categories

### 1. **Action Icons** (7 icons)
User interactions and controls

| Icon | Import | Use Case |
|------|--------|----------|
| ✅ Check | `CheckIcon` | Success states, completed tasks |
| ✓ Checkmark | `CheckmarkIcon` | Confirmation, validation |
| ✕ X | `XIcon` | Close, remove, delete |
| ✕ Close | `CloseIcon` | Close modals, dialogs |
| 📋 Copy | `CopyIcon` | Copy to clipboard |
| ⬆️ Upload | `UploadIcon` | File upload actions |
| 🔄 Refresh | `RefreshIcon` | Reload, sync data |

```typescript
import { CheckIcon, XIcon, CopyIcon } from '@/components/icons/action';
```

---

### 2. **Navigation Icons** (4 icons)
Site navigation and discovery

| Icon | Import | Use Case |
|------|--------|----------|
| 🏠 Home | `HomeIcon` | Homepage link |
| 🧭 Compass | `CompassIcon` | Explore, discover |
| 🔍 Search | `SearchIcon` | Search bars, filters |
| 🔽 Filter | `FilterIcon` | Filter controls |

```typescript
import { SearchIcon, FilterIcon } from '@/components/icons/navigation';
```

---

### 3. **Blockchain Icons** (9 icons)
Cryptocurrency and Web3

| Icon | Import | Use Case |
|------|--------|----------|
| ₿ Bitcoin | `BitcoinIcon` | Bitcoin transactions |
| Ξ Ethereum | `EthereumIcon` | Ethereum, Base chain |
| ⚡ BNB | `BnbIcon` | BNB Chain |
| ₳ Cardano | `CardanoIcon` | Cardano ecosystem |
| Ð Doge | `DogeIcon` | Dogecoin |
| 🌊 Flow | `FlowIcon` | Flow blockchain |
| ₮ Tether | `TetherIcon` | USDT stablecoin |
| 💵 USDC | `UsdcIcon` | USDC stablecoin |

```typescript
import { EthereumIcon, UsdcIcon } from '@/components/icons/blockchain';
```

---

### 4. **Layout Icons** (8 icons)
Layout controls and grid systems

| Icon | Import | Use Case |
|------|--------|----------|
| 📐 Classic Layout | `ClassicLayoutIcon` | Classic view mode |
| ⬜ Minimal Layout | `MinimalLayoutIcon` | Minimal view |
| 🎨 Modern Layout | `ModernLayoutIcon` | Modern view |
| 🕹️ Retro Layout | `RetroLayoutIcon` | Retro view |
| ◻️ Compact Grid | `CompactGridIcon` | Compact grid |
| ⬛ Normal Grid | `NormalGridIcon` | Normal grid |
| ⬅️ Left Align | `LeftAlignIcon` | Left alignment |
| ➡️ Right Align | `RightAlignIcon` | Right alignment |

```typescript
import { CompactGridIcon, NormalGridIcon } from '@/components/icons/layout';
```

---

### 5. **UI Icons** (12 icons)
Status, feedback, and general UI

| Icon | Import | Use Case |
|------|--------|----------|
| ℹ️ Info | `InfoIcon` | Information tooltips |
| ⓘ Info Circle | `InfoCircleIcon` | Help text |
| ⚠️ Warning | `WarningIcon` | Warning messages |
| ❓ Question | `QuestionIcon` | Help icons |
| ⭐ Star | `StarIcon` | Favorites, ratings |
| 🏆 Trophy | `TrophyIcon` | Achievements |
| ✓ Verified | `VerifiedIcon` | Verified users |
| ➕ Plus | `PlusIcon` | Add, create new |

```typescript
import { StarIcon, TrophyIcon, VerifiedIcon } from '@/components/icons/ui';
```

---

### 6. **Brand Icons** (5 icons) - `components/icons/brands/`
Social media and platforms

| Icon | Import | Use Case |
|------|--------|----------|
| 𝕏 Twitter/X | `TwitterIcon` | Twitter/X links |
| <> GitHub | `GithubIcon` | GitHub profiles |
| 📷 Instagram | `InstagramIcon` | Instagram links |
| ✈️ Telegram | `TelegramIcon` | Telegram community |
| 📘 Facebook | `FacebookIcon` | Facebook pages |

```typescript
import { TwitterIcon, GithubIcon } from '@/components/icons/brands';
```

---

### 7. **Material Design Icons** (20 core icons) - `components/icons/material/`
Professional Material Design patterns from Music template

| Icon | Import | Use Case |
|------|--------|----------|
| ⚡ Bolt | `BoltIcon` | Quick actions, premium |
| ✅ CheckCircle | `CheckCircleIcon` | Success confirmations |
| ❌ Error | `ErrorIcon` | Error states |
| ⚠️ Warning | `WarningIcon` | Warnings |
| ℹ️ Info | `InfoIcon` | Information |
| 👤 Person | `PersonIcon` | User profiles |
| 📊 Leaderboard | `LeaderboardIcon` | Rankings |
| 🔥 LocalFireDepartment | `LocalFireDepartmentIcon` | Trending, hot |
| ⬆️ TrendingUp | `TrendingUpIcon` | Growth, increase |
| ⬇️ TrendingDown | `TrendingDownIcon` | Decrease |
| 🏆 EmojiEvents | `EmojiEventsIcon` | Events, rewards |
| 🔍 Search | `SearchIcon` | Search functionality |
| 🏠 Home | `HomeIcon` | Homepage |
| ☰ Menu | `MenuIcon` | Navigation menu |
| ✕ Close | `CloseIcon` | Close actions |
| ◀️ ChevronLeft | `ChevronLeftIcon` | Previous, back |
| ▶️ ChevronRight | `ChevronRightIcon` | Next, forward |
| ▼ ExpandMore | `ExpandMoreIcon` | Expand sections |
| 🔽 FilterList | `FilterListIcon` | Filter controls |
| 🔗 Share | `ShareIcon` | Share content |

```typescript
import { BoltIcon, TrendingUpIcon, LeaderboardIcon } from '@/components/icons/material';
```

---

## 🎯 Template Icon Library Reference

### **Music Template** - 1,980 Material Design Icons
Location: `planning/template/music/common/resources/client/icons/material/`

**Most Useful Categories**:
- **Arrows**: ArrowBack, ArrowForward, ArrowUpward, ArrowDownward, ArrowCircleUp, etc. (20+ variants)
- **Time**: AccessTime, AvTimer, Schedule, Timer, Today, etc.
- **People**: Person, People, Group, AccountCircle, Contacts, etc.
- **Communication**: Chat, Message, Mail, Notifications, Comment, etc.
- **Actions**: Add, Remove, Edit, Delete, Save, Done, etc.
- **Status**: CheckCircle, Error, Warning, Info, Cancel, etc.
- **Charts**: BarChart, LineChart, PieChart, TrendingUp, ShowChart, etc.
- **Rewards**: Badge, EmojiEvents, Stars, Favorite, Grade, etc.

**Quick Search**:
```bash
# Find specific icon
ls planning/template/music/common/resources/client/icons/material/ | grep "Trend"
ls planning/template/music/common/resources/client/icons/material/ | grep "Chart"
ls planning/template/music/common/resources/client/icons/material/ | grep "Person"
```

---

### **Gmeowbased0.6** - 70+ Crypto/Gaming Icons
Location: `planning/template/gmeowbased0.6/src/components/icons/`

**Highlights**:
- Crypto icons (bitcoin, ethereum, etc.) ← **Already migrated**
- Gaming patterns (trophy, star, level)
- Web3 specific (wallet, exchange, swap)

---

### **Jumbo-7.4** - Material UI Icons
Location: `planning/template/jumbo-7.4/.../public/assets/images/icons/`

**Highlights**:
- Professional Material Design
- Icon sets (outlined, filled, rounded)
- Animation-ready SVGs

---

### **Trezoadmin-41** - Admin Dashboard Icons
Location: `planning/template/trezoadmin-41/.../public/images/icons/`

**Highlights**:
- Admin-focused (settings, dashboard, analytics)
- Professional business icons
- Multiple landing page themes (crypto, finance, ecommerce)

---

## 📝 Usage Patterns

### **1. Standard Icon Import**
```typescript
import { SearchIcon } from '@/components/icons/navigation';
import { TrophyIcon, StarIcon } from '@/components/icons/ui';

<SearchIcon className="w-5 h-5 text-gray-400" />
<TrophyIcon className="w-6 h-6 text-yellow-500" />
```

### **2. Material Design Icons**
```typescript
import { TrendingUpIcon, BoltIcon } from '@/components/icons/material';

<TrendingUpIcon className="w-4 h-4" />
<BoltIcon className="w-5 h-5 text-blue-500" />
```

### **3. Conditional Icon Rendering**
```typescript
import { CheckCircleIcon, ErrorIcon } from '@/components/icons/material';

{status === 'success' ? (
  <CheckCircleIcon className="w-5 h-5 text-green-500" />
) : (
  <ErrorIcon className="w-5 h-5 text-red-500" />
)}
```

### **4. Icon with Animation (Framer Motion)**
```typescript
import { motion } from 'framer-motion';
import { StarIcon } from '@/components/icons/ui';

<motion.div
  whileHover={{ scale: 1.2, rotate: 15 }}
  whileTap={{ scale: 0.9 }}
>
  <StarIcon className="w-6 h-6 text-yellow-400" />
</motion.div>
```

---

## ✅ Icon Creation Checklist

**BEFORE creating a new icon, complete this checklist**:

1. [ ] Search `components/icons/` categories
2. [ ] Search root `components/icons/` folder
3. [ ] Check Music template (1,980 icons)
   ```bash
   ls planning/template/music/common/resources/client/icons/material/ | grep "YourIconName"
   ```
4. [ ] Check Gmeowbased0.6 template
5. [ ] Check if icon exists in Material Design icon library
6. [ ] If icon exists in template, copy and adapt (don't recreate!)
7. [ ] If creating new icon:
   - Use existing icon as template
   - Follow SVG pattern (React.FC wrapper)
   - Add to appropriate category folder
   - Update category `index.ts`
   - Add to this documentation

---

## 🚀 Migration Roadmap

### **Phase 1: Categorize Root Icons** ✅ COMPLETE
- [x] Create category folders (action, navigation, blockchain, layout, ui)
- [x] Move 45+ icons to categories
- [x] Create index.ts exports for each category

### **Phase 2: Extract Template Icons** (Next)
- [ ] Copy commonly needed Material icons from Music template
  - Arrows (10 variants)
  - Time/Date (Calendar, Clock, Timer)
  - People (Person, Group, Contacts)
  - Communication (Chat, Mail, Notification)
  - Charts (Bar, Line, Trend)
- [ ] Add to appropriate categories
- [ ] Update index files

### **Phase 3: Complete Documentation** (Next)
- [ ] Add all 525+ icons to documentation
- [ ] Create visual icon reference guide
- [ ] Add icon usage examples for each category

---

## 🎨 Icon Design Guidelines

### **1. Consistency**
- Use 24x24 viewBox for Material icons
- Use 16x16 or 18x18 viewBox for smaller icons
- Maintain stroke-width consistency (usually 1.5 or 2)

### **2. Naming Convention**
```typescript
// ✅ GOOD
CheckIcon, SearchIcon, TrophyIcon

// ❌ BAD
Check, SearchComp, trophy_icon
```

### **3. File Structure**
```typescript
// Template for new icons
export const YourIcon: React.FC<React.SVGAttributes<{}>> = (props) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="..." // Your SVG path
        fill="currentColor"
        stroke="currentColor"
      />
    </svg>
  );
};
```

### **4. Color Handling**
Always use `currentColor` so icons inherit parent text color:
```typescript
fill="currentColor"
stroke="currentColor"
```

---

## 🔥 Quick Reference

**Most Used Icons**:
```typescript
// Navigation
import { SearchIcon, FilterIcon, HomeIcon } from '@/components/icons/navigation';

// Actions
import { CheckIcon, CloseIcon, CopyIcon } from '@/components/icons/action';

// Status
import { StarIcon, TrophyIcon, VerifiedIcon } from '@/components/icons/ui';

// Material
import { TrendingUpIcon, BoltIcon, LeaderboardIcon } from '@/components/icons/material';

// Blockchain
import { EthereumIcon, UsdcIcon } from '@/components/icons/blockchain';
```

**Template Sources**:
- Music: 1,980 Material Design icons
- Gmeowbased0.6: 70+ crypto/gaming icons
- Jumbo-7.4: Material UI variants
- Trezoadmin-41: Admin dashboard icons

**Total Available**: 2,100+ icons across templates + 525 custom icons = **2,625+ icons**

---

## 📞 Support

**Questions?**
- Check this documentation first
- Search template libraries
- Reference CURRENT-TASK.md for icon cleanup history
- Check FOUNDATION-REBUILD-ROADMAP.md for icon system decisions

**Last Updated**: January 19, 2025
