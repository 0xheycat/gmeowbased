/**
 * Webhook Utility for Subsquid Processor
 * Sends event notifications to the Next.js app
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/subsquid'
const WEBHOOK_SECRET = process.env.SUBSQUID_WEBHOOK_SECRET || 'dev-secret'

interface WebhookEvent {
  eventType: string
  data: any
  timestamp: string
  txHash: string
  blockNumber: number
}

export async function sendWebhook(event: WebhookEvent): Promise<void> {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_SECRET}`,
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      console.error(`[webhook] Failed to send ${event.eventType}:`, response.statusText)
    }
  } catch (error) {
    console.error(`[webhook] Error sending ${event.eventType}:`, error)
  }
}

export function createWebhookEvent(
  eventType: string,
  data: any,
  timestamp: Date,
  txHash: string,
  blockNumber: number
): WebhookEvent {
  return {
    eventType,
    data,
    timestamp: timestamp.toISOString(),
    txHash,
    blockNumber,
  }
}
