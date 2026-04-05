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

  if (!profile || !profile.is_active || profile.access_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const {
    employee_off,
    role_group_id,
    shift_date,
    shift_label,
    notes,
    visible_user_ids,
  } = body

  if (!employee_off || !role_group_id || !shift_date || !shift_label) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    )
  }

  if (!Array.isArray(visible_user_ids)) {
    return NextResponse.json(
      { error: 'visible_user_ids must be an array' },
      { status: 400 }
    )
  }

  const { data: createdShift, error: shiftError } = await adminSupabase
    .from('shifts')
    .insert({
      employee_off,
      role_group_id,
      shift_date,
      shift_label,
      notes: notes || null,
      status: 'open',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (shiftError || !createdShift) {
    return NextResponse.json(
      { error: shiftError?.message || 'Failed to create shift' },
      { status: 400 }
    )
  }

  if (visible_user_ids.length > 0) {
    const visibilityRows = visible_user_ids.map((userId: string) => ({
      shift_id: createdShift.id,
      user_id: userId,
    }))

    const { error: visibilityError } = await adminSupabase
      .from('shift_visible_users')
      .insert(visibilityRows)

    if (visibilityError) {
      await adminSupabase.from('shifts').delete().eq('id', createdShift.id)

      return NextResponse.json(
        { error: visibilityError.message || 'Failed to assign shift visibility' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ success: true })
}