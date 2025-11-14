/*
 * Experimental tip listener that bridges Farcaster Hub -> dashboard SSE.
 *
 * Requirements:
 *   npm install @farcaster/hub-nodejs
 *   export TIP_INGEST_URL="https://your-app.vercel.app/api/tips/ingest"
 *   export TIP_INGEST_KEY="<match NEXT server env>"
 *   export TIP_HUB_ADDR="<host:port of hub, default nemesishub.xyz:2283>"
 *   export TIP_TARGET_FIDS="12345,67890"   # Optional allowlist
 */

import 'dotenv/config'

const DEFAULT_HUB = process.env.TIP_HUB_ADDR ?? 'nemesishub.xyz:2283'
const INGEST_URL = process.env.TIP_INGEST_URL ?? 'http://localhost:3000/api/tips/ingest'
const INGEST_KEY = process.env.TIP_INGEST_KEY ?? ''
const TARGET_FIDS = (process.env.TIP_TARGET_FIDS || '')
  .split(',')
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0)

async function main() {
  let HubEventType: any
  let HubSubscriber: any

  try {
    const hubModule = (await import('@farcaster/hub-nodejs')) as any
    HubEventType = hubModule.HubEventType
    HubSubscriber = hubModule.HubSubscriber ?? hubModule.default?.HubSubscriber
    if (!HubEventType || !HubSubscriber) throw new Error('HubSubscriber export missing from @farcaster/hub-nodejs')
  } catch (error) {
    console.error('Failed to load @farcaster/hub-nodejs. Ensure it is installed and exports HubSubscriber.', error)
    process.exit(1)
  }

  const hub = new HubSubscriber(DEFAULT_HUB, {
    retryIntervalInMs: 5_000,
    statsdSocket: undefined,
  })

  console.log(`Connecting to hub ${DEFAULT_HUB} for tip events…`)

  const stream = hub.subscribe({ events: [HubEventType.LINK_ADD] })

  for await (const event of stream) {
    try {
      if (!event || typeof event !== 'object') continue
      if (event.type !== HubEventType.LINK_ADD && event.type !== 'link_add') continue

      const linkBody = event.linkBody ?? event.link?.body ?? {}
      if (!linkBody) continue
      const linkType = (linkBody.type || linkBody.linkType || '').toString().toLowerCase()
      if (linkType !== 'tip') continue

      const toFid = Number(linkBody.targetFid ?? linkBody.target?.fid ?? 0)
      const fromFid = Number(linkBody.fid ?? linkBody.source?.fid ?? 0)
      if (!toFid || !fromFid) continue
      if (TARGET_FIDS.length && !TARGET_FIDS.includes(toFid)) continue

      const amount = Number(linkBody.metadata?.amount ?? linkBody.amount ?? 0)
      const symbol = linkBody.metadata?.asset?.symbol ?? linkBody.asset?.symbol ?? 'TIP'
      const txHash = linkBody.metadata?.transactionHash ?? linkBody.txHash ?? undefined
      const message = linkBody.metadata?.message ?? undefined
      const chain = linkBody.metadata?.chain ?? undefined
      const toAddress = linkBody.target?.address ?? linkBody.targetAddress ?? undefined
      const fromAddress = linkBody.source?.address ?? linkBody.sourceAddress ?? undefined
      const fromUsername = linkBody.source?.username ?? linkBody.metadata?.source?.username ?? undefined
      const fromDisplay = linkBody.source?.displayName ?? linkBody.metadata?.source?.displayName ?? fromUsername
      const castHash = linkBody.metadata?.castHash ?? linkBody.castHash ?? undefined
      const frameUrl = linkBody.metadata?.frameUrl ?? undefined
      const shareText = linkBody.metadata?.shareText ?? undefined
      const rawPoints = Number(linkBody.metadata?.points ?? linkBody.points ?? NaN)
      const points = Number.isFinite(rawPoints) ? rawPoints : undefined

      const payload = {
        id: event.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        chain,
        toFid,
        toAddress: typeof toAddress === 'string' ? toAddress.toLowerCase() : undefined,
        fromFid,
        fromAddress: typeof fromAddress === 'string' ? fromAddress.toLowerCase() : undefined,
        fromUsername: typeof fromUsername === 'string' ? fromUsername : undefined,
        fromDisplay: typeof fromDisplay === 'string' ? fromDisplay : undefined,
        amount: Number.isFinite(amount) ? amount : undefined,
        symbol: typeof symbol === 'string' ? symbol : undefined,
        message: typeof message === 'string' ? message : undefined,
        txHash: typeof txHash === 'string' ? txHash : undefined,
        castHash: typeof castHash === 'string' ? castHash : undefined,
        frameUrl: typeof frameUrl === 'string' ? frameUrl : undefined,
        shareText: typeof shareText === 'string' ? shareText : undefined,
        points,
        createdAt: Date.now(),
      }

      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(INGEST_KEY ? { authorization: `Bearer ${INGEST_KEY}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        console.error('Failed to forward tip to dashboard', res.status, text)
      } else {
        console.log(`Tip forwarded: fid ${fromFid} -> ${toFid} (${payload.amount ?? 'unknown'} ${payload.symbol ?? ''})`)
      }
    } catch (err) {
      console.error('Tip handling failed', err)
    }
  }
}

void main().catch((error) => {
  console.error('Tip worker crashed', error)
  process.exit(1)
})
