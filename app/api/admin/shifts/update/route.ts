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

  const body = await req.json()

  const {
    shift_id,
    shift_date,
    shift_label,
    employee_off,
    role_group_id,
    notes,
  } = body

  if (!shift_id || !shift_date || !shift_label || !employee_off || !role_group_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error: updateError } = await adminSupabase
    .from('shifts')
    .update({
      shift_date,
      shift_label,
      employee_off,
      role_group_id,
      notes: notes ?? null,
    })
    .eq('id', shift_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  await adminSupabase.from('shift_audit_log').insert({
    shift_id,
    action: 'edit_shift',
    actor_user_id: user.id,
    target_user_id: null,
    metadata: {
      shift_date,
      shift_label,
      employee_off,
      role_group_id,
      notes: notes ?? null,
    },
  })

  return NextResponse.json({ success: true })
}