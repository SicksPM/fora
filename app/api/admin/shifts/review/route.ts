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
    .select('access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.access_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { shift_id, action } = body

  if (!shift_id || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data: shift, error: shiftError } = await adminSupabase
    .from('shifts')
    .select('id, status, held_by')
    .eq('id', shift_id)
    .maybeSingle()

  if (shiftError || !shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  if (shift.status !== 'pending_hold') {
    return NextResponse.json(
      { error: 'Shift is not pending review' },
      { status: 400 }
    )
  }

  if (action === 'approve') {
    if (!shift.held_by) {
      return NextResponse.json(
        { error: 'No employee is holding this shift' },
        { status: 400 }
      )
    }

    const { error } = await adminSupabase
      .from('shifts')
      .update({
        status: 'confirmed',
        confirmed_user_id: shift.held_by,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', shift_id)
      .eq('status', 'pending_hold')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'reject') {
    const { error } = await adminSupabase
      .from('shifts')
      .update({
        status: 'open',
        held_by: null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq('id', shift_id)
      .eq('status', 'pending_hold')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}