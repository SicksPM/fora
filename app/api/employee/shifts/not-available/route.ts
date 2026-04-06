import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.access_role !== 'employee') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { shift_id, note } = body

  if (!shift_id) {
    return NextResponse.json({ error: 'shift_id is required' }, { status: 400 })
  }

  const { data: visibleRow } = await supabase
    .from('shift_visible_users')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!visibleRow) {
    return NextResponse.json(
      { error: 'You do not have access to this shift' },
      { status: 403 }
    )
  }

  const { error } = await supabase.from('shift_not_available').insert({
    shift_id,
    user_id: user.id,
    note: note || null,
  })

  if (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to mark shift as not available' },
      { status: 400 }
    )
  }

  await adminSupabase.from('shift_audit_log').insert({
    shift_id,
    action: 'not_available',
    actor_user_id: user.id,
    target_user_id: user.id,
    metadata: note ? { note } : {},
  })

  return NextResponse.json({ success: true })
}