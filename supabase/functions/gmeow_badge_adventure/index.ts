// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0"

type BadgeTemplateRow = {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  badge_type: string
  description: string | null
  chain: string
  points_cost: number
  image_url: string | null
  art_path: string | null
  active: boolean
  metadata: Record<string, unknown> | null
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const FUNCTION_SECRET = Deno.env.get("GMEOW_BADGE_ADVENTURE_SECRET") ?? SERVICE_ROLE_KEY

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  })
}

function getAuthToken(request: Request): string | null {
  const header = request.headers.get("authorization")
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

serve(async (request) => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ ok: false, error: "Supabase credentials are not configured" }, { status: 500 })
  }

  const token = getAuthToken(request)
  if (!token) {
    return json({ ok: false, error: "Missing authorization header" }, { status: 401 })
  }
  if (token !== FUNCTION_SECRET) {
    return json({ ok: false, error: "Invalid authorization token" }, { status: 403 })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        "X-Client-Info": "gmeow-badge-adventure/2025-11-11",
      },
    },
  })

  const url = new URL(request.url)
  const includeInactive = url.searchParams.get("include_inactive") === "1"

  let query = supabase.from<BadgeTemplateRow>("gmeow_badge_adventure").select("*").order("points_cost", {
    ascending: true,
  })

  if (!includeInactive) {
    query = query.eq("active", true)
  }

  const { data, error } = await query
  if (error) {
    console.error("Failed to load badge templates", error)
    return json({ ok: false, error: error.message ?? "Unknown error" }, { status: 500 })
  }

  return json({ ok: true, templates: data ?? [] })
})
