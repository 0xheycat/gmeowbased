import { NextResponse, type NextRequest } from 'next/server'

import { BADGE_BUCKET_NAME, invalidateBadgeCaches, uploadBadgeArt } from '@/lib/badges'
import { getSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase-server'
import { validateAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const auth = await validateAdminRequest(req)
  if (!auth.ok && auth.reason !== 'admin_security_disabled') {
    return NextResponse.json({ ok: false, error: 'admin_auth_required', reason: auth.reason }, { status: 401 })
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'file field is required' }, { status: 400 })
    }

    const { url, path } = await uploadBadgeArt(file)
    const removePath = form.get('removePath')
    if (removePath && typeof removePath === 'string' && removePath.trim().length > 0) {
      const supabase = getSupabaseServerClient()
      if (supabase) {
        await supabase.storage.from(BADGE_BUCKET_NAME).remove([removePath])
      }
    }
    await invalidateBadgeCaches()
    return NextResponse.json({ ok: true, url, path })
  } catch (error) {
    const message = (error as Error)?.message || 'Failed to upload badge art'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
