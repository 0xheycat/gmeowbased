import {assertNotNull} from '@subsquid/util-internal'
import {
    BlockHeader,
    DataHandlerContext,
    EvmBatchProcessor,
    EvmBatchProcessorFields,
    Log as _Log,
    Transaction as _Transaction,
} from '@subsquid/evm-processor'
import { getCurrentEndpoint, initializeRpcManager } from './rpc-manager'

// Initialize automatic RPC failover manager
initializeRpcManager()

// Gmeow contract addresses on Base (updated Dec 31, 2025)
export const SCORING_ADDRESS = '0xdeCFDc900DD1DBD6f947d3558143aA8374413Bd6'.toLowerCase()
export const CORE_ADDRESS = '0x343829A6A613d51B4A81c2dE508e49CA66D4548d'.toLowerCase()
export const GUILD_ADDRESS = '0xC3AA96aDA307BaD7e6c2d7575051fA19C358C097'.toLowerCase()
export const NFT_ADDRESS = '0x34d0CD77Ba8d643C1d5f568331d61eFa35132eA8'.toLowerCase()
export const BADGE_ADDRESS = '0x45a2aaa181dd5f9b1fd173b135b44f5207ee3dbb'.toLowerCase()
export const REFERRAL_ADDRESS = '0x50941e1033fF8E163fB60A0433b1CB2bc71Ce8Df'.toLowerCase()

// Get current RPC endpoint (automatically rotates on failure)
const currentRpc = getCurrentEndpoint()

export const processor = new EvmBatchProcessor()
    // Base mainnet archive
    .setGateway('https://v2.archive.subsquid.io/network/base-mainnet')
    // Base RPC endpoint (automatic failover via rpc-manager)
    .setRpcEndpoint({
        url: assertNotNull(currentRpc.url, 'No RPC endpoint supplied'),
        rateLimit: currentRpc.rateLimit
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
        from: 40193345, // Earliest deployment block: ScoringModule (Dec 31, 2025)
    })
    .addLog({
        address: [SCORING_ADDRESS],
        // Listen for ALL events from ScoringModule (StatsUpdated, LevelUp, RankUp, etc.)
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
