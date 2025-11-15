import { useState, useRef, useEffect } from 'react'
import { formatUnknownError } from '@/components/quest-wizard/utils'
import type { WalletAutoState } from '@/components/quest-wizard/types'

type NotificationInput = {
	tone: 'info' | 'success' | 'warning' | 'error'
	title: string
	description?: string
	duration?: number
}

type UseWalletConnectionOptions = {
	isMiniAppSession: boolean
	isConnected: boolean
	activeConnector: any
	connectors: readonly any[]
	connect: (params: { connector: any }) => void
	connectAsync?: (params: { connector: any }) => Promise<any>
	pushNotification: (input: NotificationInput) => number
	dismissNotification: (id: number) => void
}

export function useWalletConnection({
	isMiniAppSession,
	isConnected,
	activeConnector,
	connectors,
	connect,
	connectAsync,
	pushNotification,
	dismissNotification,
}: UseWalletConnectionOptions) {
	const [walletAutoState, setWalletAutoState] = useState<WalletAutoState>({ 
		status: 'idle', 
		connectorName: null, 
		lastError: null 
	})
	const triedWalletAutoRef = useRef(false)
	const pendingWalletToastRef = useRef<number | null>(null)

	// Auto-connect wallet when not in mini-app session
	useEffect(() => {
		if (isMiniAppSession) return
		if (isConnected) return
		if (triedWalletAutoRef.current) return
		if (!Array.isArray(connectors) || connectors.length === 0) {
			triedWalletAutoRef.current = true
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			pushNotification({
				tone: 'warning',
				title: 'No desktop wallet connector',
				description: 'Add a Farcaster-compatible signer to test the Gmeow wizard on desktop.',
			})
			return
		}
		const availableConnectors = connectors.filter((connector) => {
			if (typeof connector.ready === 'boolean') return connector.ready
			return true
		})
		if (!availableConnectors.length) {
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			return
		}
		const preferredConnector =
			availableConnectors.find((connector) => {
				const id = connector?.id?.toString?.().toLowerCase?.()
				const name = connector?.name?.toLowerCase?.()
				return Boolean(id && id.includes('farcaster')) || Boolean(name && name.includes('farcaster'))
			}) ?? availableConnectors[0]
		if (!preferredConnector) {
			setWalletAutoState({ status: 'missing', connectorName: null, lastError: null })
			return
		}
		triedWalletAutoRef.current = true
		const attempt = async () => {
			if (pendingWalletToastRef.current) {
				dismissNotification(pendingWalletToastRef.current)
				pendingWalletToastRef.current = null
			}
			const friendlyName = preferredConnector?.name || 'your wallet'
			const startToastId = pushNotification({
				tone: 'info',
				title: 'Connecting wallet',
				description: `Gmeow is attempting to link ${friendlyName}. Approve the prompt if it appears.`,
				duration: 6200,
			})
			pendingWalletToastRef.current = startToastId
			setWalletAutoState({ status: 'attempting', connectorName: friendlyName, lastError: null })
			try {
				if (typeof connectAsync === 'function') {
					await connectAsync({ connector: preferredConnector })
					dismissNotification(startToastId)
					pendingWalletToastRef.current = null
					setWalletAutoState({ status: 'connected', connectorName: friendlyName, lastError: null })
					pushNotification({
						tone: 'success',
						title: 'Wallet connected',
						description: 'Gmeow successfully linked your wallet for the demo.',
					})
				} else {
					connect({ connector: preferredConnector })
					dismissNotification(startToastId)
					pendingWalletToastRef.current = null
					setWalletAutoState({ status: 'requested', connectorName: friendlyName, lastError: null })
					pushNotification({
						tone: 'info',
						title: 'Wallet connection requested',
						description: 'Approve the signer request to finalize the Gmeow link.',
					})
				}
			} catch (error) {
				console.warn('Auto wallet connect failed:', error)
				dismissNotification(startToastId)
				pendingWalletToastRef.current = null
				setWalletAutoState({ status: 'failed', connectorName: friendlyName, lastError: formatUnknownError(error, 'Automatic wallet connection did not complete.') })
				pushNotification({
					tone: 'error',
					title: 'Wallet connection failed',
					description: formatUnknownError(error, 'We could not connect your wallet automatically.'),
				})
			}
		}
		setTimeout(() => {
			void attempt()
		}, 0)
	}, [connect, connectAsync, connectors, dismissNotification, isConnected, isMiniAppSession, pushNotification])

	// Reset tried flag when entering mini-app session
	useEffect(() => {
		if (isMiniAppSession) {
			triedWalletAutoRef.current = false
		}
	}, [isMiniAppSession])

	// Sync wallet state with connection status
	useEffect(() => {
		if (isConnected) {
			const connectorName = activeConnector?.name || null
			setWalletAutoState((prev) => {
				const resolvedName = connectorName ?? prev.connectorName ?? null
				if (prev.status === 'connected' && prev.connectorName === resolvedName) {
					return prev
				}
				return { status: 'connected', connectorName: resolvedName, lastError: null }
			})
		} else {
			setWalletAutoState((prev) => {
				if (prev.status === 'connected' || prev.status === 'requested') {
					return { status: 'idle', connectorName: prev.connectorName ?? null, lastError: prev.lastError ?? null }
				}
				return prev
			})
		}
	}, [activeConnector, isConnected])

	return {
		walletAutoState,
	}
}
