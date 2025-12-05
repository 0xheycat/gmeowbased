/**
 * Icons Index - Centralized Icon Exports
 * 
 * SINGLE SOURCE OF TRUTH for ALL icons - both MUI and custom SVG icons.
 * 
 * Usage:
 * import { CheckCircleIcon, Bitcoin, Trophy, ChevronRight } from '@/components/icons';
 * 
 * Benefits:
 * - One import path for everything: '@/components/icons'
 * - MUI icons with "Icon" suffix for clarity
 * - Custom SVG icons for blockchain, brands, layouts
 * - Direct MUI imports still work: import Icon from '@mui/icons-material/Icon'
 * - Tree-shakable - only imports what you use
 * 
 * Browse all MUI icons: https://mui.com/material-ui/material-icons/
 */

// ============================================================================
// CUSTOM ICON SUBDIRECTORIES - Custom SVG Icons
// ============================================================================

// Action Icons (Check, Close, Copy, Upload, Refresh)
export * from './action';

// Blockchain/Crypto Icons (Bitcoin, Ethereum, BNB, Cardano, Doge, etc.)
export * from './blockchain';

// Brand Icons (Twitter, Facebook, Instagram, GitHub, Telegram)
export { Facebook } from './brands/facebook';
export { Github } from './brands/github';
export { Instagram } from './brands/instagram';
export { Telegram } from './brands/telegram';
export { Twitter } from './brands/twitter';

// Navigation Icons (Home, Compass, Search, Filter)
export * from './navigation';

// UI Icons (Star, Trophy, Verified, Plus, Info, Warning)
export * from './ui';

// Layout Icons (Grid layouts, alignment icons) - ALL USE NAMED EXPORTS
export { ClassicLayoutIcon } from './layout/classic-layout-icon';
export { CompactGridIcon } from './layout/compact-grid';
export { LeftAlign } from './layout/left-align';
export { MinimalLayoutIcon } from './layout/minimal-layout-icon';
export { ModernLayoutIcon } from './layout/modern-layout-icon';
export { NormalGridIcon } from './layout/normal-grid';
export { RetroLayoutIcon } from './layout/retro-layout-icon';
export { RightAlign } from './layout/right-align';

// Custom SVG Icons (Root level) - NAMED EXPORTS (export function/const)
export { ArrowLinkIcon } from './arrow-link-icon';
export { ArrowRight } from './arrow-right';
export { ArrowUp } from './arrow-up';
export { ArrowUpDownIcon } from './arrow-up-down';  // exports ArrowUpDownIcon
export { BookIcon } from './book';
export { CalendarIcon as Calendar } from './calendar';  // calendar.tsx exports CalendarIcon
export { CalendarIcon } from './calendar-icon';
export { ChevronDown } from './chevron-down';
export { ChevronForward } from './chevron-forward';
export { ChevronRight } from './chevron-right';
export { ClockIcon } from './clock';
export { DiskIcon } from './disk';
export { DocumentIcon } from './document';
export { DotsIcon } from './dots-icon';
export { ExchangeIcon } from './exchange';
export { ExportIcon } from './export-icon';
export { ExternalLink as ExternalLinkIcon } from './external-link';  // exports ExternalLink
export { EyeIcon } from './eye';
export { EyeSlashIcon } from './eyeslash';
export { FarmIcon } from './farm';
export { FlashIcon } from './flash';
export { GasIcon } from './gas-icon';
export { GuideIcon } from './guide-icon';
export { HistoryIcon } from './history';
export { IconUSFlag } from './icon-us-flag';
export { LevelIcon } from './level-icon';
export { LinkIcon } from './link-icon';
export { LivePricing as LivePricingIcon } from './live-pricing';  // exports LivePricing
export { LockIcon } from './lock-icon';
export { LongArrowLeft } from './long-arrow-left';
export { LongArrowRight } from './long-arrow-right';
export { LongArrowUp } from './long-arrow-up';
export { LoopIcon } from './loop-icon';
export { MediaPlayIcon } from './media-play-icon';
export { Moon as MoonIcon } from './moon';  // exports Moon
export { MoreIcon } from './more-icon';
export { OptionIcon } from './option';
export { PlayIcon } from './play-icon';
export { PoolIcon } from './pool';
export { PowerIcon } from './power';
// export { ProfileIcon } from './profile'; // REMOVED - profile rebuild in progress
export { RangeIcon } from './range-icon';
export { SandClock as SandClockIcon } from './sand-clock';  // exports SandClock
export { ShutdownIcon as ShutDownIcon } from './shut-down-icon';  // exports ShutdownIcon (different casing)
export { SpikeBarIcon } from './spike-bar';
export { Sun as SunIcon } from './sun';  // exports Sun
export { SwapIcon } from './swap-icon';
export { TagIcon } from './tag-icon';
export { Tag } from './tag';
export { TradingBotIcon } from './trading-bot-icon';
export { TrendArrowDownIcon } from './trend-arrow-down-icon';
export { TrendArrowUpIcon } from './trend-arrow-up-icon';
export { Unlocked as UnlockedIcon } from './unlocked';  // exports Unlocked
export { UsersIcon } from './users';
export { VoteIcon } from './vote-icon';

// Custom SVG Icons (Root level) - DEFAULT EXPORTS ONLY
export { default as CheckIcon } from './check-icon';
export { default as HorizontalThreeDotsIcon } from './horizontal-three-dots';
export { default as ImageIcon } from './image-icon';
export { default as UploadIcon } from './upload-icon';
export { default as VerticalThreeDotsIcon } from './vertical-three-dots';
export { default as XIcon } from './x-icon';

// Custom Icon Utilities
export { SvgIcon } from './svg-icon';
export { createSvgIcon } from './create-svg-icon';

// ============================================================================
// MUI MATERIAL ICONS - Commonly Used with "Icon" Suffix
// ============================================================================

// Actions
export { default as AddIcon } from '@mui/icons-material/Add';
export { default as DeleteIcon } from '@mui/icons-material/Delete';
export { default as EditIcon } from '@mui/icons-material/Edit';
export { default as SaveIcon } from '@mui/icons-material/Save';
export { default as CloseIcon } from '@mui/icons-material/Close';
export { default as CheckCircleIcon } from '@mui/icons-material/CheckCircle';
export { default as CancelIcon } from '@mui/icons-material/Cancel';
export { default as RemoveIcon } from '@mui/icons-material/Remove';
export { default as ContentCopyIcon } from '@mui/icons-material/ContentCopy';
export { default as ShareIcon } from '@mui/icons-material/Share';
export { default as SendIcon } from '@mui/icons-material/Send';
export { default as ReplyIcon } from '@mui/icons-material/Reply';
export { default as RefreshIcon } from '@mui/icons-material/Refresh';
export { default as DownloadIcon } from '@mui/icons-material/Download';

// Navigation
export { default as ChevronLeftIcon } from '@mui/icons-material/ChevronLeft';
export { default as ChevronRightIcon } from '@mui/icons-material/ChevronRight';
export { default as KeyboardArrowUpIcon } from '@mui/icons-material/KeyboardArrowUp';
export { default as KeyboardArrowDownIcon } from '@mui/icons-material/KeyboardArrowDown';
export { default as ArrowForwardIcon } from '@mui/icons-material/ArrowForward';
export { default as ArrowBackIcon } from '@mui/icons-material/ArrowBack';
export { default as ExpandMoreIcon } from '@mui/icons-material/ExpandMore';
export { default as NavigateBeforeIcon } from '@mui/icons-material/NavigateBefore';
export { default as NavigateNextIcon } from '@mui/icons-material/NavigateNext';
export { default as FirstPageIcon } from '@mui/icons-material/FirstPage';
export { default as LastPageIcon } from '@mui/icons-material/LastPage';
export { default as MenuIcon } from '@mui/icons-material/Menu';
export { default as MoreHorizIcon } from '@mui/icons-material/MoreHoriz';
export { default as MoreVertIcon } from '@mui/icons-material/MoreVert';

// Status & Indicators
export { default as ErrorIcon } from '@mui/icons-material/Error';
export { default as WarningIcon } from '@mui/icons-material/Warning';
export { default as NotificationsIcon } from '@mui/icons-material/Notifications';
export { default as VisibilityIcon } from '@mui/icons-material/Visibility';
export { default as VisibilityOffIcon } from '@mui/icons-material/VisibilityOff';
export { default as FavoriteIcon } from '@mui/icons-material/Favorite';
export { default as StarIcon } from '@mui/icons-material/Star';
export { default as TrendingUpIcon } from '@mui/icons-material/TrendingUp';
export { default as TrendingDownIcon } from '@mui/icons-material/TrendingDown';

// UI Elements
export { default as FilterListIcon } from '@mui/icons-material/FilterList';
export { default as SettingsIcon } from '@mui/icons-material/Settings';
export { default as DashboardIcon } from '@mui/icons-material/Dashboard';
export { default as PersonIcon } from '@mui/icons-material/Person';
export { default as GroupIcon } from '@mui/icons-material/Group';
export { default as PeopleIcon } from '@mui/icons-material/People';
export { default as FolderIcon } from '@mui/icons-material/Folder';
export { default as AttachFileIcon } from '@mui/icons-material/AttachFile';

// Quest & Gamification
export { default as EmojiEventsIcon } from '@mui/icons-material/EmojiEvents'; // Trophy
export { default as MilitaryTechIcon } from '@mui/icons-material/MilitaryTech'; // Badge
export { default as WorkspacePremiumIcon } from '@mui/icons-material/WorkspacePremium'; // Crown
export { default as LocalFireDepartmentIcon } from '@mui/icons-material/LocalFireDepartment'; // Fire
export { default as BoltIcon } from '@mui/icons-material/Bolt'; // Lightning
export { default as AutoAwesomeIcon } from '@mui/icons-material/AutoAwesome'; // Sparkle
export { default as LeaderboardIcon } from '@mui/icons-material/Leaderboard';

// Finance & Commerce
export { default as MonetizationOnIcon } from '@mui/icons-material/MonetizationOn'; // Coins
export { default as PaymentIcon } from '@mui/icons-material/Payment';
export { default as ShoppingCartIcon } from '@mui/icons-material/ShoppingCart';
export { default as CurrencyBitcoinIcon } from '@mui/icons-material/CurrencyBitcoin';
export { default as SwapHorizIcon } from '@mui/icons-material/SwapHoriz'; // Exchange/Swap

// Time & Scheduling
export { default as AccessTimeIcon } from '@mui/icons-material/AccessTime'; // Clock
export { default as CalendarTodayIcon } from '@mui/icons-material/CalendarToday';
export { default as ScheduleIcon } from '@mui/icons-material/Schedule';

/**
 * ============================================================================
 * USAGE GUIDE
 * ============================================================================
 * 
 * // Import ANY icon from '@/components/icons':
 * import { 
 *   CheckCircleIcon,      // MUI icon
 *   Bitcoin,              // Custom blockchain icon
 *   Trophy,               // Custom UI icon
 *   ChevronRight,         // Custom arrow icon
 *   Twitter,              // Custom brand icon
 * } from '@/components/icons';
 * 
 * // Use in components:
 * <CheckCircleIcon className="h-5 w-5" />
 * <Bitcoin className="h-6 w-6" />
 * <Trophy variant="gold" />
 * 
 * // Direct MUI imports still work (if icon not in this index):
 * import AccountCircleIcon from '@mui/icons-material/AccountCircle';
 * 
 * ============================================================================
 * ADDING NEW ICONS
 * ============================================================================
 * 
 * For MUI icons:
 * 1. Find at: https://mui.com/material-ui/material-icons/
 * 2. Add: export { default as YourIconNameIcon } from '@mui/icons-material/YourIconName';
 * 
 * For custom SVG icons:
 * 1. Create icon file in appropriate subdirectory (action/, blockchain/, ui/, etc.)
 * 2. Add to subdirectory's index.ts
 * 3. Export is automatic via export * from './subdirectory'
 * 
 * ============================================================================
 */
