export type AuthStatus = 'idle' | 'pending' | 'success' | 'error'

export type WalletAutoStatus = 'idle' | 'attempting' | 'requested' | 'connected' | 'failed' | 'missing'

export type WalletAutoState = {
	status: WalletAutoStatus
	connectorName?: string | null
	lastError?: string | null
}

type MiniKitModule = typeof import('@coinbase/onchainkit/minikit')

type MiniKitHookReturn = ReturnType<MiniKitModule['useMiniKit']>

export type MiniKitContextType = MiniKitHookReturn['context']

export type MiniKitContextUser = {
	fid?: number | string
	username?: string
	displayName?: string
} & Record<string, unknown>

export type MiniAppSignInResult = import('@farcaster/miniapp-core/dist/actions/SignIn').SignInResult

type ParseSignInMessage = MiniKitModule['parseSignInMessage']

export type ParsedMiniKitSignIn = ReturnType<ParseSignInMessage>

export type MiniAppAuthMethod = MiniAppSignInResult['authMethod']
