import { launch } from 'chrome-launcher'

async function testChrome() {
  try {
    console.log('🚀 Testing chrome-launcher...')
    const chrome = await launch({
      chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
    })
    console.log(`✅ Chrome launched on port ${chrome.port}`)
    await chrome.kill()
    console.log('✅ Chrome closed')
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed:', error.message)
    process.exit(1)
  }
}

testChrome()
