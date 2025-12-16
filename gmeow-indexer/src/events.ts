// Event topics computed from ABIs
// Core contract events
export const GM_EVENT_TOPIC = '0x' + 'TODO' // GMEvent(address indexed user, uint256 rewardPoints, uint256 newStreak)
export const GM_SENT_TOPIC = '0x' + 'TODO' // GMSent(address indexed user, uint256 streak, uint256 pointsEarned)
export const BADGE_MINTED_TOPIC = '0x' + 'TODO' // BadgeMinted(address indexed to, uint256 indexed tokenId, string badgeType)

// Guild contract events
export const GUILD_CREATED_TOPIC = '0x' + 'TODO' // GuildCreated(uint256 indexed guildId, address indexed leader, string name)
export const GUILD_JOINED_TOPIC = '0x' + 'TODO' // GuildJoined(uint256 indexed guildId, address indexed member)
export const GUILD_LEFT_TOPIC = '0x' + 'TODO' // GuildLeft(uint256 indexed guildId, address indexed member)

// Badge/NFT contract events (ERC721 Transfer)
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
