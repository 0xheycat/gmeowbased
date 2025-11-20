import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function isSupabaseConfigured(): boolean {
    return Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY))
}

export function getSupabaseServerClient(): SupabaseClient | null {
    if (!isSupabaseConfigured()) return null
    if (cachedClient) return cachedClient

    const url = process.env.SUPABASE_URL as string
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) as string

    cachedClient = createClient(url, key, {
        auth: {
            persistSession: false,
        },
        global: {
            headers: {
                'X-Client-Info': 'gmeow-leaderboard/1.0.0',
            },
            fetch: (url, options = {}) => {
                // Add 10s timeout to all fetch requests to prevent hanging
                const controller = new AbortController()
                const timeoutId = setTimeout(() => controller.abort(), 10000)
                
                return fetch(url, {
                    ...options,
                    signal: controller.signal,
                }).finally(() => clearTimeout(timeoutId))
            },
        },
    })

    return cachedClient
}
