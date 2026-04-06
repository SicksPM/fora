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

  const shift_id_raw = formData.get('shift_id')
  const user_id_raw = formData.get('user_id')

  const shift_id = Number(shift_id_raw)
  const user_id = typeof user_id_raw === 'string' ? user_id_raw : ''

  if (!shift_id || !user_id) {
    return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  const { data: employeeProfile, error: employeeError } = await supabase
    .from('profiles')
    .select('id, access_role, is_active')
    .eq('id', user_id)
    .maybeSingle()

  if (
    employeeError ||
    !employeeProfile ||
    !employeeProfile.is_active ||
    employeeProfile.access_role !== 'employee'
  ) {
    return NextResponse.json(
      { error: 'Selected user is not a valid active employee' },
      { status: 400 }
    )
  }

  const { data: shift, error: shiftError } = await adminSupabase
    .from('shifts')
    .select('id')
    .eq('id', shift_id)
    .maybeSingle()

  if (shiftError || !shift) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }

  const { error: updateError } = await adminSupabase
    .from('shifts')
    .update({
      confirmed_user_id: user_id,
      held_by: null,
      status: 'confirmed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq('id', shift_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await adminSupabase.from('shift_audit_log').insert({
    shift_id,
    action: 'override_confirm',
    actor_user_id: user.id,
    target_user_id: user_id,
    metadata: {},
  })

  return NextResponse.redirect(new URL('/app/admin/shifts', req.url), 303)
}