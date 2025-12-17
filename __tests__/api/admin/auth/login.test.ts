/**
 * API Route Test: /api/admin/auth/login
 * 
 * Tests admin authentication with passcode and optional TOTP
 * Quality Gate: GI-12 (Unit Test Coverage)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/admin/auth/login/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/admin-auth', () => ({
	isAdminSecurityEnabled: vi.fn(),
	isTotpRequired: vi.fn(),
	validateAccessCode: vi.fn(),
	validateTotp: vi.fn(),
	issueAdminSession: vi.fn(),
	buildAdminSessionCookie: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
	rateLimit: vi.fn(),
	getClientIp: vi.fn(),
	strictLimiter: {},
}))

import { 
	isAdminSecurityEnabled, 
	isTotpRequired, 
	validateAccessCode, 
	validateTotp,
	issueAdminSession,
	buildAdminSessionCookie,
} from '@/lib/admin-auth'
import { rateLimit, getClientIp } from '@/lib/middleware/rate-limit'

describe('/api/admin/auth/login', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
		vi.mocked(rateLimit).mockResolvedValue({ success: true } as any)
		vi.mocked(isAdminSecurityEnabled).mockReturnValue(true)
		vi.mocked(isTotpRequired).mockReturnValue(false)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('Success Cases', () => {
		it('should login successfully with valid passcode', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test-token' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test-cookie',
				options: { httpOnly: true },
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'correct-pass', remember: false }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.ok).toBe(true)
			expect(response.cookies.get('admin_session')).toBeDefined()
		})

		it('should login successfully with TOTP enabled', async () => {
			vi.mocked(isTotpRequired).mockReturnValue(true)
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(validateTotp).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test-token' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test-cookie',
				options: { httpOnly: true },
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'correct-pass', totp: '123456' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(200)
			expect(data.ok).toBe(true)
		})

		it('should respect remember flag', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test-token' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test-cookie',
				options: { httpOnly: true, maxAge: 2592000 }, // 30 days
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'correct-pass', remember: true }),
			})

			const response = await POST(req)

			expect(response.status).toBe(200)
			expect(vi.mocked(issueAdminSession)).toHaveBeenCalledWith({ remember: true })
		})
	})

	describe('Validation Failures', () => {
		it('should reject missing passcode', async () => {
			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({}),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.ok).toBe(false)
			expect(data.error).toBe('Invalid input')
			expect(data.details).toBeDefined()
		})

		it('should reject invalid JSON', async () => {
			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: 'invalid-json{',
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.error).toBe('Invalid JSON payload')
		})

		it('should reject empty passcode string', async () => {
			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: '' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(400)
			expect(data.details).toBeDefined()
		})

		it('should validate schema with optional fields', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test-token' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test-cookie',
				options: {},
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ 
					passcode: 'valid-pass',
					totp: undefined,
					remember: undefined,
				}),
			})

			const response = await POST(req)

			expect(response.status).toBe(200)
		})
	})

	describe('Authentication Failures', () => {
		it('should reject incorrect passcode', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(false)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'wrong-pass' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(401)
			expect(data.ok).toBe(false)
			expect(data.error).toBe('Invalid credentials')
		})

		it('should reject incorrect TOTP when required', async () => {
			vi.mocked(isTotpRequired).mockReturnValue(true)
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(validateTotp).mockReturnValue(false)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'correct-pass', totp: 'wrong-totp' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(401)
			expect(data.error).toBe('Invalid one-time code')
		})

		it('should reject missing TOTP when required', async () => {
			vi.mocked(isTotpRequired).mockReturnValue(true)
			vi.mocked(validateAccessCode).mockReturnValue(true)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'correct-pass' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(401)
			expect(data.error).toBe('Invalid one-time code')
		})
	})

	describe('Rate Limiting', () => {
		it('should reject when rate limit exceeded', async () => {
			vi.mocked(rateLimit).mockResolvedValue({ success: false } as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'test' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(429)
			expect(data.error).toBe('Rate limit exceeded')
		})

		it('should use strict rate limiter for admin login', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test',
				options: {},
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'test' }),
			})

			await POST(req)

			expect(vi.mocked(rateLimit)).toHaveBeenCalledWith('127.0.0.1', expect.any(Object))
		})
	})

	describe('Configuration Errors', () => {
		it('should return 500 when admin security not configured', async () => {
			vi.mocked(isAdminSecurityEnabled).mockReturnValue(false)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'test' }),
			})

			const response = await POST(req)
			const data = await response.json()

			expect(response.status).toBe(500)
			expect(data.error).toContain('not configured')
		})
	})

	describe('Edge Cases', () => {
		it('should handle very long passcode', async () => {
			const longPasscode = 'a'.repeat(1000)
			vi.mocked(validateAccessCode).mockReturnValue(false)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: longPasscode }),
			})

			const response = await POST(req)

			expect(response.status).toBe(401)
		})

		it('should handle special characters in passcode', async () => {
			const specialPasscode = '!@#$%^&*()_+-=[]{}|;:,.<>?'
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test',
				options: {},
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: specialPasscode }),
			})

			const response = await POST(req)

			expect(response.status).toBe(200)
		})

		it('should handle boolean remember as string', async () => {
			vi.mocked(validateAccessCode).mockReturnValue(true)
			vi.mocked(issueAdminSession).mockResolvedValue({ token: 'test' } as any)
			vi.mocked(buildAdminSessionCookie).mockReturnValue({
				name: 'admin_session',
				value: 'test',
				options: {},
			} as any)

			const req = new NextRequest('http://localhost:3000/api/admin/auth/login', {
				method: 'POST',
				body: JSON.stringify({ passcode: 'test', remember: 'true' as any }),
			})

			const response = await POST(req)
			const data = await response.json()

			// Should fail validation since remember must be boolean
			expect(response.status).toBe(400)
		})
	})
})
