#!/usr/bin/env node
/**
 * scripts/dev-tunnel.mjs
 *
 * Usage examples:
 *   pnpm dev:tunnel
 *   node scripts/dev-tunnel.mjs --frame leaderboards --address 0xabc... --no-open
 *   node scripts/dev-tunnel.mjs --frame-path "/api/frame?type=gm-card&fid=1"
 *  pnpm exec node scripts/dev-tunnel.mjs
 * Features:
 * 1. Starts (or reuses) the local Next.js dev server.
 * 2. Creates a secure tunnel via localtunnel with automatic fallback subdomain.
 * 3. Emits ready-to-share URLs for Warpcast, frame validators, and raw frame inspection.
 * 4. Offers CLI/env overrides for port, frame path, wallet address, share text, and auto-open behaviour.
 *
 * Dependencies:
 *   pnpm add -D localtunnel open
 */

import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import localtunnel from 'localtunnel'
import open from 'open'

const DEFAULTS = {
  port: Number(process.env.PORT ?? 3000),
  subdomain: process.env.GMEOW_TUNNEL_SUBDOMAIN ?? '',
  frameType: process.env.GMEOW_FRAME_TYPE ?? 'gm',
  framePath: process.env.GMEOW_FRAME_PATH ?? '/api/frame?type=:type&user=:user',
  userAddress: process.env.GMEOW_FRAME_USER ?? '0x8a3094e44577579d6f41F6214a86C250b7dBDC4e',
  shareText: process.env.GMEOW_FRAME_SHARE_TEXT ?? 'GM sent on Optimism! Join me on GMEOW.',
  autoOpen: process.env.GMEOW_TUNNEL_OPEN === 'false' ? false : true,
  openTarget: process.env.GMEOW_TUNNEL_OPEN_TARGET ?? 'Warpcast Dev Tester',
}

const HELP_TEXT = `
Usage: node scripts/dev-tunnel.mjs [options]

Options:
  -p, --port <number>          Port for Next.js dev server (default: ${DEFAULTS.port})
  -s, --subdomain <name>       Preferred localtunnel subdomain (fallbacks to random)
  -t, --frame <type>           Frame type (sets :type placeholder in frame path)
      --frame-path <path>      Custom frame path template (supports :type and :user tokens)
  -a, --address <0x..>         Wallet address to inject into frame URL (:user token)
      --text <message>         Share text for Warpcast compose link
      --no-open                Do not auto-open the frame tester in browser
      --open-target <label>    Which tester to auto-open (Warpcast Dev Tester | Framescanner)
  -h, --help                   Show help

Environment variable overrides:
  PORT, GMEOW_TUNNEL_SUBDOMAIN, GMEOW_FRAME_TYPE, GMEOW_FRAME_PATH,
  GMEOW_FRAME_USER, GMEOW_FRAME_SHARE_TEXT, GMEOW_TUNNEL_OPEN,
  GMEOW_TUNNEL_OPEN_TARGET
`

function parseArgs(argv = process.argv.slice(2)) {
  const options = { ...DEFAULTS }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    switch (arg) {
      case '-h':
      case '--help':
        console.log(HELP_TEXT)
        process.exit(0)
        break
      case '-p':
      case '--port':
        options.port = Number(argv[++i] ?? options.port)
        break
      case '-s':
      case '--subdomain':
        options.subdomain = argv[++i] ?? ''
        break
      case '-t':
      case '--frame':
        options.frameType = argv[++i] ?? options.frameType
        break
      case '--frame-path':
        options.framePath = argv[++i] ?? options.framePath
        break
      case '-a':
      case '--address':
        options.userAddress = argv[++i] ?? options.userAddress
        break
      case '--text':
        options.shareText = argv[++i] ?? options.shareText
        break
      case '--no-open':
        options.autoOpen = false
        break
      case '--open-target':
        options.openTarget = argv[++i] ?? options.openTarget
        break
      default:
        console.warn(`Unknown option: ${arg}`)
        break
    }
  }

  return options
}

function normalizePath(pathTemplate, { frameType, userAddress }) {
  const trimmed = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`
  return trimmed.replaceAll(':type', frameType).replaceAll(':user', userAddress)
}

function encodeShareText(text) {
  return encodeURIComponent(text)
}

function randomSubdomain() {
  return `gmeow-${Math.random().toString(36).slice(2, 8)}`
}

function createRetryableError(message, status, retryable = true) {
  const err = new Error(message)
  err.status = status
  err.retryable = retryable
  return err
}

async function isPortActive(port) {
  const url = `http://127.0.0.1:${port}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(1500),
      headers: { accept: 'text/html' },
    })
    return res.status >= 200 && res.status < 500
  } catch (_) {
    return false
  }
}

async function waitForServer(port, timeoutMs = 90_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await isPortActive(port)) return true
    await sleep(1000)
  }
  return false
}

async function ensureNextServer(port) {
  if (await isPortActive(port)) {
    console.log('\x1b[33mℹ︎ Detected existing Next.js dev server. Reusing it.\x1b[0m')
    return { process: null, spawned: false }
  }

  console.log(`\x1b[36m▶ Starting Next.js on port ${port}...\x1b[0m`)
  const proc = spawn('npx', ['next', 'dev', '-p', String(port)], {
    stdio: 'inherit',
    shell: true,
  })

  const ready = await waitForServer(port)
  if (!ready) {
    proc.kill('SIGINT')
    throw new Error(`Next.js dev server failed to start on port ${port} within timeout`)
  }

  return { process: proc, spawned: true }
}

async function validateTunnelHealth(tunnel, normalizedPath, { retries = 4, delayMs = 1500 } = {}) {
  const base = tunnel.url.endsWith('/') ? tunnel.url.slice(0, -1) : tunnel.url
  const targets = [`${base}/`, `${base}${normalizedPath}`]

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const failures = []
    for (const target of targets) {
      try {
        const res = await fetch(target, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(4000),
          headers: { accept: 'text/html,application/json' },
        })

        if (res.status === 503) {
          throw createRetryableError('Tunnel responded with 503 (Service Unavailable).', res.status, true)
        }

        if (res.status >= 500) {
          throw createRetryableError(`Server responded with ${res.status} for ${target}.`, res.status, false)
        }

        // Any < 500 status is fine (200/302/404 all indicate tunnel is routing).
      } catch (err) {
        failures.push(err)
        break
      }
    }

    if (failures.length === 0) {
      return true
    }

    const err = failures[0]
    const retryable = err?.retryable !== false
    const statusInfo = err?.status ? ` (status ${err.status})` : ''
    console.warn(`\x1b[33m⚠︎ Tunnel health check failed${statusInfo}: ${err?.message ?? err}.\x1b[0m`)

    if (!retryable || attempt === retries) {
      throw err
    }

    await sleep(delayMs * attempt)
  }

  return true
}

async function createTunnel(port, preferredSubdomain, { validate } = {}) {
  const attempt = async subdomain => {
    const tunnel = await localtunnel({ port, subdomain })
    try {
      if (validate) {
        await validate(tunnel)
      }
      return tunnel
    } catch (err) {
      try {
        tunnel.close()
      } catch (_) {}
      throw err
    }
  }

  if (preferredSubdomain) {
    try {
      return await attempt(preferredSubdomain)
    } catch (err) {
      const retryable = err?.retryable !== false
      console.warn(`\x1b[33m⚠︎ Preferred subdomain "${preferredSubdomain}" failed (${err?.message ?? err}).${retryable ? ' Falling back to random.' : ''}\x1b[0m`)
      if (!retryable) {
        throw err
      }
    }
  }

  let lastError
  for (let i = 0; i < 4; i += 1) {
    const random = randomSubdomain()
    try {
      return await attempt(random)
    } catch (err) {
      lastError = err
      const retryable = err?.retryable !== false
      console.warn(`\x1b[33m⚠︎ localtunnel attempt failed (${random}): ${err?.message ?? err}.${retryable ? ' Retrying...' : ''}\x1b[0m`)
      if (!retryable) {
        break
      }
      await sleep(600 * (i + 1))
    }
  }

  throw lastError ?? new Error('Unable to establish localtunnel connection')
}

function buildTestUrls(baseUrl, { framePath, userAddress, shareText, openTarget }) {
  const trimmedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const frameUrl = `${trimmedBase}${framePath}`
  const encodedFrame = encodeURIComponent(frameUrl)
  const encodedText = encodeShareText(shareText)

  const urls = [
    {
      label: 'Warpcast Compose',
      url: `https://warpcast.com/~/compose?text=${encodedText}&embeds[]=${encodedFrame}`,
    },
    {
      label: 'Warpcast Dev Tester',
      url: `https://warpcast.com/~/developers/frames?url=${encodedFrame}`,
    },
    {
      label: 'Framescanner',
      url: `https://framescanner.xyz/?url=${encodedFrame}`,
    },
    {
      label: 'Raw Frame',
      url: frameUrl,
    },
  ]

  const preferred = urls.find(entry => entry.label === openTarget)
  return { urls, frameUrl, preferredOpen: preferred ?? urls[1] }
}

function registerCleanup({ tunnel, nextProc, spawnedNext }) {
  let hasCleaned = false

  const cleanup = () => {
    if (hasCleaned) return
    hasCleaned = true

    console.log('\n🧹 Closing tunnel...')
    try {
      tunnel?.close()
    } catch (_) {}

    if (spawnedNext && nextProc) {
      nextProc.kill('SIGINT')
    }
  }

  process.on('SIGINT', () => {
    cleanup()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    cleanup()
    process.exit(0)
  })

  process.on('exit', cleanup)

  if (nextProc) {
    nextProc.on('exit', code => {
      if (!hasCleaned) {
        console.log(`\n\x1b[31mNext.js process exited (${code}). Shutting down tunnel.\x1b[0m`)
        cleanup()
        process.exit(code ?? 0)
      }
    })
  }
}

async function start() {
  console.clear()
  const options = parseArgs()

  console.log(`\x1b[36mGMEOW Frame Tunnel\x1b[0m`)
  console.log(`Port        : ${options.port}`)
  console.log(`Frame type  : ${options.frameType}`)
  console.log(`Frame path  : ${options.framePath}`)
  console.log(`Wallet      : ${options.userAddress}`)
  console.log(`Subdomain   : ${options.subdomain || '(auto)'}`)
  console.log(`Auto-open   : ${options.autoOpen ? 'yes' : 'no'}`)
  console.log('')

  const { process: nextProc, spawned } = await ensureNextServer(options.port)
  const normalizedPath = normalizePath(options.framePath, options)

  console.log('\n\x1b[36m🌐 Creating secure tunnel via localtunnel...\x1b[0m')
  const tunnel = await createTunnel(options.port, options.subdomain, {
    validate: t => validateTunnelHealth(t, normalizedPath),
  }).catch(err => {
    console.error('\n\x1b[31mlocaltunnel error:', err.message ?? err, '\x1b[0m')
    if (spawned && nextProc) nextProc.kill('SIGINT')
    process.exit(1)
  })

  console.log(`Resolved path: ${normalizedPath}`)
  const { urls, frameUrl, preferredOpen } = buildTestUrls(tunnel.url, {
    framePath: normalizedPath,
    userAddress: options.userAddress,
    shareText: options.shareText,
    openTarget: options.openTarget,
  })

  console.log('\n\x1b[32m✅ Tunnel active!\x1b[0m\n')
  console.log('Local  →', `http://localhost:${options.port}`)
  console.log('Public →', tunnel.url)
  console.log('Frame  →', frameUrl)
  console.log('\n--- Test URLs ---')
  for (const entry of urls) {
    console.log(`${entry.label.padEnd(18, ' ')}: ${entry.url}`)
  }
  console.log('-----------------\n')

  if (options.autoOpen && preferredOpen?.url) {
    await open(preferredOpen.url).catch(() => {
      console.warn('\x1b[33m⚠︎ Unable to auto-open browser. Copy URLs manually.\x1b[0m')
    })
  }

  registerCleanup({ tunnel, nextProc, spawnedNext: spawned })

  console.log('\x1b[36mPress Ctrl+C to stop the tunnel.\x1b[0m')
}

start().catch(err => {
  console.error('\x1b[31mUnexpected error:\x1b[0m', err)
  process.exit(1)
})
