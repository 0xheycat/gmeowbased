'use client'

import { ConnectWallet } from '@/components/ConnectWallet'

type Props = {
  connected: boolean
}

export function ConnectWalletSection({ connected }: Props) {
  if (connected) return null

  return (
    <section className="connect">
      <div className="connect-inner">
        <div className="copy">
          <span>Wallet sync</span>
          <h2>Connect to keep your streak in sync</h2>
          <p>Link a wallet to claim rewards, register referral codes, and deploy guild boosts on-chain.</p>
        </div>
        <ConnectWallet />
      </div>
    </section>
  )
}
