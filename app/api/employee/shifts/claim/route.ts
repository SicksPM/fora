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
  const { shift_id } = body

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

  const { data: notAvailableRow } = await supabase
    .from('shift_not_available')
    .select('id')
    .eq('shift_id', shift_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (notAvailableRow) {
    return NextResponse.json(
      { error: 'You already marked this shift as not available' },
      { status: 400 }
    )
  }

  const { data: updatedShift, error: updateError } = await adminSupabase
    .from('shifts')
    .update({
      status: 'pending_hold',
      held_by: user.id,
    })
    .eq('id', shift_id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message || 'Failed to claim shift' },
      { status: 400 }
    )
  }

  if (!updatedShift) {
    return NextResponse.json(
      { error: 'This shift is no longer available' },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true })
}