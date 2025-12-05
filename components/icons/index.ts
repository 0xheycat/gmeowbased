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

// Layout Icons (Grid layouts, alignment icons)
export { ClassicLayoutIcon } from './layout/classic-layout-icon';
export { CompactGrid } from './layout/compact-grid';
export { LeftAlign } from './layout/left-align';
export { MinimalLayoutIcon } from './layout/minimal-layout-icon';
export { ModernLayoutIcon } from './layout/modern-layout-icon';
export { NormalGrid } from './layout/normal-grid';
export { RetroLayoutIcon } from './layout/retro-layout-icon';
export { RightAlign } from './layout/right-align';

// Custom SVG Icons (Root level - commonly used)
export { default as ArrowLinkIcon } from './arrow-link-icon';
export { default as ArrowRight } from './arrow-right';
export { default as ArrowUp } from './arrow-up';
export { default as ArrowUpDown } from './arrow-up-down';
export { default as BookIcon } from './book';
export { default as CalendarIcon } from './calendar-icon';
export { default as Calendar } from './calendar';
export { default as CheckIcon } from './check-icon';
export { default as ChevronDown } from './chevron-down';
export { default as ChevronForward } from './chevron-forward';
export { default as ChevronRight } from './chevron-right';
export { default as ClockIcon } from './clock';
export { default as DiskIcon } from './disk';
export { default as DocumentIcon } from './document';
export { default as DotsIcon } from './dots-icon';
export { default as ExchangeIcon } from './exchange';
export { default as ExportIcon } from './export-icon';
export { default as ExternalLinkIcon } from './external-link';
export { default as EyeIcon } from './eye';
export { default as EyeSlashIcon } from './eyeslash';
export { default as FarmIcon } from './farm';
export { default as FlashIcon } from './flash';
export { default as GasIcon } from './gas-icon';
export { default as GuideIcon } from './guide-icon';
export { default as HistoryIcon } from './history';
export { default as HorizontalThreeDotsIcon } from './horizontal-three-dots';
export { default as IconUSFlag } from './icon-us-flag';
export { default as ImageIcon } from './image-icon';
export { default as LevelIcon } from './level-icon';
export { default as LinkIcon } from './link-icon';
export { default as LivePricingIcon } from './live-pricing';
export { default as LockIcon } from './lock-icon';
export { default as LongArrowLeft } from './long-arrow-left';
export { default as LongArrowRight } from './long-arrow-right';
export { default as LongArrowUp } from './long-arrow-up';
export { default as LoopIcon } from './loop-icon';
export { default as MediaPlayIcon } from './media-play-icon';
export { default as MoonIcon } from './moon';
export { default as MoreIcon } from './more-icon';
export { default as OptionIcon } from './option';
export { default as PlayIcon } from './play-icon';
export { default as PoolIcon } from './pool';
export { default as PowerIcon } from './power';
export { default as ProfileIcon } from './profile';
export { default as RangeIcon } from './range-icon';
export { default as SandClockIcon } from './sand-clock';
export { default as ShutDownIcon } from './shut-down-icon';
export { default as SpikeBarIcon } from './spike-bar';
export { default as SunIcon } from './sun';
export { default as SwapIcon } from './swap-icon';
export { default as TagIcon } from './tag-icon';
export { default as Tag } from './tag';
export { default as TradingBotIcon } from './trading-bot-icon';
export { default as TrendArrowDownIcon } from './trend-arrow-down-icon';
export { default as TrendArrowUpIcon } from './trend-arrow-up-icon';
export { default as UnlockedIcon } from './unlocked';
export { default as UploadIcon } from './upload-icon';
export { default as UsersIcon } from './users';
export { default as VerticalThreeDotsIcon } from './vertical-three-dots';
export { default as VoteIcon } from './vote-icon';
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
