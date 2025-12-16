import {assertNotNull} from '@subsquid/util-internal'
import {
    BlockHeader,
    DataHandlerContext,
    EvmBatchProcessor,
    EvmBatchProcessorFields,
    Log as _Log,
    Transaction as _Transaction,
} from '@subsquid/evm-processor'

// Gmeow contract addresses on Base (verified Dec 11, 2025)
export const CORE_ADDRESS = '0x9EB9bEC3fDcdE8741c65436df1b60d50Facd9D73'.toLowerCase()
export const GUILD_ADDRESS = '0x6754e71fFd49Fb9C33C19dA1Aa6596155e53C8A3'.toLowerCase()
export const NFT_ADDRESS = '0xCE9596a992e38c5fa2d997ea916a277E0F652D5C'.toLowerCase()
export const BADGE_ADDRESS = '0x5Af50Ee323C45564d94B0869d95698D837c59aD2'.toLowerCase()
export const REFERRAL_ADDRESS = '0x9E7c32C1fB3a2c08e973185181512a442b90Ba44'.toLowerCase()

export const processor = new EvmBatchProcessor()
    // Base mainnet archive
    .setGateway('https://v2.archive.subsquid.io/network/base-mainnet')
    // Base RPC endpoint
    .setRpcEndpoint({
        url: assertNotNull(process.env.RPC_BASE_HTTP || 'https://mainnet.base.org', 'No RPC endpoint supplied'),
        rateLimit: 10
    })
    .setFinalityConfirmation(10) // Base has faster finality
    .setFields({
        log: {
            topics: true,
            data: true,
        },
        transaction: {
            from: true,
            to: true,
            value: true,
            hash: true,
        },
    })
    .setBlockRange({
        from: 39270005, // Deployment block (Dec 10, 2025)
    })
    .addLog({
        address: [CORE_ADDRESS],
        // Listen for ALL events from Core contract
    })
    .addLog({
        address: [GUILD_ADDRESS],
        // Listen for ALL events from Guild contract
    })
    .addLog({
        address: [BADGE_ADDRESS],
        // Listen for ALL events from Badge contract (ERC721 Transfer)
    })
    .addLog({
        address: [REFERRAL_ADDRESS],
        // Listen for ALL events from Referral contract
    })
    .addLog({
        address: [NFT_ADDRESS],
        // Listen for ALL events from NFT contract (ERC721 Transfer)
    })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
