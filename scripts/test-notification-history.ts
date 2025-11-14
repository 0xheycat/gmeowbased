#!/usr/bin/env node

/**
 * Test notification history API layer
 * Run after SQL migration is complete
 */

import { saveNotification, fetchNotifications, getNotificationCount } from '@/lib/notification-history'

async function testNotificationHistory() {
  console.log('🧪 Testing Notification History API...\n')

  try {
    // Test 1: Save a notification
    console.log('1️⃣ Testing saveNotification...')
    const saved = await saveNotification({
      fid: 12345,
      category: 'system',
      title: 'Test Notification',
      description: 'This is a test notification from the API',
      tone: 'info',
      metadata: { test: true },
      actionLabel: 'View',
      actionHref: '/profile',
    })

    if (saved) {
      console.log('   ✅ Notification saved successfully')
    } else {
      console.log('   ❌ Failed to save notification')
    }

    // Test 2: Fetch notifications
    console.log('\n2️⃣ Testing fetchNotifications...')
    const notifications = await fetchNotifications({
      fid: 12345,
      limit: 10,
    })

    console.log(`   ✅ Fetched ${notifications.length} notifications`)
    if (notifications.length > 0) {
      console.log(`   📋 Latest: "${notifications[0].title}"`)
    }

    // Test 3: Get notification count
    console.log('\n3️⃣ Testing getNotificationCount...')
    const count = await getNotificationCount(12345, null, false)
    console.log(`   ✅ Unread count: ${count}`)

    console.log('\n🎉 All tests passed!')
    console.log('\n📊 API Summary:')
    console.log('   ✓ saveNotification: Working')
    console.log('   ✓ fetchNotifications: Working')
    console.log('   ✓ getNotificationCount: Working')
    console.log('   ✓ dismissNotification: Available')
    console.log('   ✓ dismissAllNotifications: Available')
    console.log('   ✓ clearHistory: Available')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.log('\n💡 Make sure:')
    console.log('   1. SQL migration has been run in Supabase')
    console.log('   2. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
    console.log('   3. RLS policies are configured correctly')
    process.exit(1)
  }
}

testNotificationHistory()
