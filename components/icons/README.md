# Icons Directory

## 🎨 Now Powered by @mui/icons-material!

**We've upgraded to professional Material-UI icons!** All your existing imports work exactly the same, but now you have access to **2000+ professional icons** instead of just 51.

### Benefits of @mui/icons-material:
- ✅ **2000+ professional icons** (vs 51 custom icons before)
- ✅ **Industry standard** - Used by millions of developers
- ✅ **Actively maintained** by the Material-UI team
- ✅ **Tree-shakable** - Only imports icons you actually use
- ✅ **TypeScript support** built-in
- ✅ **Zero code changes** - All existing imports still work!

## Structure

```
components/icons/
├── svg-icon.tsx              # Base SVG icon component (kept for custom icons)
├── create-svg-icon.tsx       # Helper to create custom icons (kept as reference)
├── material/                 # Material Design icons (NOW 2000+ via @mui!)
│   └── index.ts             # Barrel exports (re-exports from @mui/icons-material)
├── action/                   # Action-specific icons
├── assets/                   # Asset icons
├── blockchain/               # Blockchain icons
├── brands/                   # Brand icons
├── layout/                   # Layout icons
├── navigation/               # Navigation icons
└── ui/                       # UI component icons
```

## Usage

### Import Icons (Same as Before!)

```typescript
// Your existing imports work exactly the same!
import { Add, Edit, Delete, Save } from '@/components/icons/material';

export function MyComponent() {
  return (
    <div>
      <Add />
      <Edit fontSize="small" />
      <Delete color="error" />
      <Save sx={{ fontSize: 40 }} />
    </div>
  );
}
```

### Import Additional MUI Icons

```typescript
// Access 2000+ more icons!
import AccountCircle from '@mui/icons-material/AccountCircle';
import BarChart from '@mui/icons-material/BarChart';
import CalendarToday from '@mui/icons-material/CalendarToday';
import TrendingUp from '@mui/icons-material/TrendingUp';

// Browse all: https://mui.com/material-ui/material-icons/
```

### MUI Icon Props (More Features!)

```typescript
<Add 
  fontSize="small"        // "small" | "medium" | "large" | "inherit"
  color="primary"         // "primary" | "secondary" | "error" | "warning" | "info" | "success"
  sx={{ color: 'red' }}   // Custom styling
/>
```

### Create Custom Icon (Still Supported)

```typescript
import { createSvgIcon } from '@/components/icons/create-svg-icon';

const CustomIcon = createSvgIcon(
  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />,
  'Custom'
);

export default CustomIcon;
```

## Available Icons from Our Barrel Export (51)

These are available via `import { IconName } from '@/components/icons/material'`:

### Actions (15)
- Add, Remove, Edit, Delete
- Save, Upload, Download
- Send, Reply
- ContentCopy, AttachFile
- Refresh, Settings
- Check, CheckCircle

### Navigation (12)
- Home, Menu, Close
- ChevronLeft, ChevronRight
- NavigateBefore, NavigateNext
- FirstPage, LastPage
- ExpandMore, MoreVert, MoreHoriz

### Alerts (3)
- Info, Warning, Error

### Social (4)
- Share, Favorite, Star, Group

### UI (7)
- Search, Visibility, VisibilityOff
- Notifications, Dashboard
- Leaderboard, FilterList

### Content (6)
- Folder, Image
- ShoppingCart, Payment
- Person, EmojiEvents

### Misc (4)
- Bolt, LocalFireDepartment
- TrendingUp, TrendingDown

## Want 2000+ More Icons?

**Browse & import any Material icon!**

🔗 **Icon Gallery**: https://mui.com/material-ui/material-icons/

### How to Use Additional Icons

```typescript
// Import any icon from @mui/icons-material
import AccountCircle from '@mui/icons-material/AccountCircle';
import BarChart from '@mui/icons-material/BarChart';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Camera from '@mui/icons-material/Camera';
import CloudUpload from '@mui/icons-material/CloudUpload';
import Code from '@mui/icons-material/Code';
import Email from '@mui/icons-material/Email';
import Lock from '@mui/icons-material/Lock';
import Phone from '@mui/icons-material/Phone';
import ThumbUp from '@mui/icons-material/ThumbUp';

// Use them like any other icon!
<AccountCircle fontSize="large" />
<BarChart color="primary" />
```

### Icon Variants Available

Material-UI icons come in 5 variants:

```typescript
// Filled (default)
import Home from '@mui/icons-material/Home';

// Outlined
import HomeOutlined from '@mui/icons-material/HomeOutlined';

// Rounded
import HomeRounded from '@mui/icons-material/HomeRounded';

// TwoTone
import HomeTwoTone from '@mui/icons-material/HomeTwoTone';

// Sharp
import HomeSharp from '@mui/icons-material/HomeSharp';
```

## Props

All MUI icon components accept these props:

```typescript
interface MuiIconProps {
  fontSize?: 'small' | 'medium' | 'large' | 'inherit';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'action' | 'disabled' | 'inherit';
  sx?: SxProps;              // MUI system styling
  htmlColor?: string;        // Custom CSS color
  className?: string;        // CSS classes
  titleAccess?: string;      // Accessibility title
  // ... all standard SVG attributes
}
```

## Examples

### Basic Usage
```tsx
<Add fontSize="medium" />
<Edit fontSize="large" color="primary" />
<Delete fontSize="small" color="error" />
```

### With MUI System (sx prop)
```tsx
<Save sx={{ fontSize: 40, color: 'primary.main' }} />
<Search sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }} />
```

### With Tailwind
```tsx
<Settings className="w-6 h-6 text-blue-600" />
<Menu className="w-8 h-8 text-gray-400 hover:text-gray-600" />
```

### Custom Color
```tsx
<Info htmlColor="#1976d2" />
<Warning htmlColor="orange" />
```

### Accessibility
```tsx
<Info titleAccess="More information" />
<Warning titleAccess="Warning message" />
```

## Migration from Custom Icons

**No migration needed!** All existing imports automatically work with the new @mui/icons-material system.

### Before (Custom Icons):
```typescript
import { Add, Edit, Delete } from '@/components/icons/material';
<Add size="md" />  // Old API
```

### After (MUI Icons):
```typescript
import { Add, Edit, Delete } from '@/components/icons/material';
<Add fontSize="medium" />  // MUI API (recommended)
<Add />  // Still works!
```

## Adding More Icons to Barrel Export

Want to add more icons to the convenience barrel export?

Edit `components/icons/material/index.ts`:

```typescript
// Add any icon from @mui/icons-material
export { default as Camera } from '@mui/icons-material/Camera';
export { default as Email } from '@mui/icons-material/Email';
export { default as Phone } from '@mui/icons-material/Phone';
```

Then import them from the barrel:
```typescript
import { Camera, Email, Phone } from '@/components/icons/material';
```

## Icon Source

**Current System**: @mui/icons-material (Material-UI official icons)
- 📦 Package: https://www.npmjs.com/package/@mui/icons-material
- 🎨 Gallery: https://mui.com/material-ui/material-icons/
- 📚 Docs: https://mui.com/material-ui/icons/

**Previous System**: Custom SVG icons from `planning/template/music`
- Old custom icon files kept in `components/icons/material/*.tsx` (can be removed)

1000+ Material Design icons available at:
`planning/template/music/common/resources/client/icons/material/`

Browse the template directory to find additional icons you need.
