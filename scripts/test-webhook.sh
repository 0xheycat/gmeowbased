#!/bin/bash
# Quick test script for auto-reply webhook
# Run: bash scripts/test-webhook.sh

WEBHOOK_SECRET="L-SPUjEhZVwoKkyhp4lRNNzPd"
BOT_FID="1069798"

# Sample payload
PAYLOAD='{
  "created_at": 1731478800,
  "type": "cast.created",
  "data": {
    "object": "cast",
    "hash": "0xabc123",
    "thread_hash": "0xabc123",
    "parent_hash": null,
    "parent_url": null,
    "root_parent_url": null,
    "parent_author": {
      "fid": null
    },
    "author": {
      "object": "user",
      "fid": 18139,
      "username": "heycat",
      "display_name": "Hey Cat",
      "pfp_url": "https://i.imgur.com/test.jpg",
      "profile": {
        "bio": {
          "text": "Test user"
        }
      },
      "follower_count": 100,
      "following_count": 50,
      "verifications": ["0x1234567890123456789012345678901234567890"],
      "verified_addresses": {
        "eth_addresses": ["0x1234567890123456789012345678901234567890"],
        "sol_addresses": []
      },
      "active_status": "active",
      "power_badge": false
    },
    "text": "Show me my stats",
    "timestamp": "2025-11-13T10:00:00.000Z",
    "embeds": [],
    "reactions": {
      "likes_count": 0,
      "recasts_count": 0,
      "likes": [],
      "recasts": []
    },
    "replies": {
      "count": 0
    },
    "mentioned_profiles": []
  }
}'

# Sign the payload
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha512 -hmac "$WEBHOOK_SECRET" | cut -d' ' -f2)

echo "🧪 Testing auto-reply webhook..."
echo "📋 Payload: Show me my stats (fid 18139)"
echo ""

curl -X POST http://localhost:3000/api/neynar/webhook \
  -H "Content-Type: application/json" \
  -H "X-Neynar-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  --silent | jq '.'

echo ""
echo "✅ Test complete!"
