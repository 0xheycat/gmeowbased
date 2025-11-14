// scripts/mock-neynar.ts
// run pnpm dlx tsx scripts/mock-neynar.ts
import crypto from 'node:crypto'
import fetch from 'node-fetch'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const secret = process.env.NEYNAR_WEBHOOK_SECRET
if (!secret) {
  console.error('Missing NEYNAR_WEBHOOK_SECRET. Export it or add it to .env.local before running this script.')
  process.exit(1)
}

const fidValue = Number(process.env.NEYNAR_BOT_FID)
if (!Number.isFinite(fidValue)) {
  console.warn('NEYNAR_BOT_FID is not set or invalid. The payload will include `null` as the mention fid.')
}

const body = JSON.stringify({
  type: 'cast.created',
  data: {
    hash: '0x9f6d010977c817d5113f00e5e670616af0f83752',
    text: '@gmeowbased show my stats',
    author: { fid: 18139, username: 'heycat', display_name: 'heycat.base.eth🐬' },
    mentioned_profiles: [{ fid: Number.isFinite(fidValue) ? fidValue : null }],
  },
})

const signature = crypto.createHmac('sha512', secret).update(body).digest('hex')

async function main() {
  const endpoint = process.env.MOCK_NEYNAR_URL ?? 'http://localhost:3000/api/neynar/webhook'
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-neynar-signature': signature },
    body,
  })

  const text = await response.text()
  console.log(`[mock-neynar] target=${endpoint}`)
  console.log(`[mock-neynar] status=${response.status}`)
  console.log(text || '(empty response)')
}

main().catch((error) => {
  console.error('[mock-neynar] failed', error)
  process.exitCode = 1
})