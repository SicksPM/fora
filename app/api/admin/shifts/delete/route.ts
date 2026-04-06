import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.access_role !== 'admin'
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const shift_id = Number(formData.get('shift_id'))

  if (!shift_id) {
    return NextResponse.json({ error: 'Missing shift_id' }, { status: 400 })
  }

  const { data: shift, error: shiftError } = await adminSupabase
    .from('shifts')
    .select(
      'id, employee_off, shift_date, shift_label, status, notes, role_group_id, held_by, confirmed_user_id'
    )
    .eq('id', shift_id)
    .maybeSingle()

  if (shiftError || !shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  await adminSupabase.from('shift_audit_log').insert({
    shift_id,
    action: 'delete_shift',
    actor_user_id: user.id,
    target_user_id: null,
    metadata: {
      employee_off: shift.employee_off,
      shift_date: shift.shift_date,
      shift_label: shift.shift_label,
      status: shift.status,
      notes: shift.notes,
      role_group_id: shift.role_group_id,
      held_by: shift.held_by,
      confirmed_user_id: shift.confirmed_user_id,
    },
  })

  const { error: deleteError } = await adminSupabase
    .from('shifts')
    .delete()
    .eq('id', shift_id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/app/admin/shifts', req.url), 303)
}