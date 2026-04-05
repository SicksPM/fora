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
  const { email, password, full_name, access_role, role_group_ids } = body

  if (
    !email ||
    !password ||
    !full_name ||
    !access_role ||
    !Array.isArray(role_group_ids)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!['admin', 'employee'].includes(access_role)) {
    return NextResponse.json({ error: 'Invalid access role' }, { status: 400 })
  }

  const { data: createdAuthUser, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

  if (authError || !createdAuthUser.user) {
    return NextResponse.json(
      { error: authError?.message || 'Failed to create auth user' },
      { status: 400 }
    )
  }

  const newUserId = createdAuthUser.user.id

  const { error: profileError } = await adminSupabase.from('profiles').insert({
    id: newUserId,
    email,
    full_name,
    access_role,
    is_active: true,
    created_by: user.id,
  })

  if (profileError) {
    await adminSupabase.auth.admin.deleteUser(newUserId)
    return NextResponse.json(
      { error: profileError.message || 'Failed to create profile' },
      { status: 400 }
    )
  }

  if (role_group_ids.length > 0) {
    const rows = role_group_ids.map((roleGroupId: number) => ({
      user_id: newUserId,
      role_group_id: roleGroupId,
    }))

    const { error: roleError } = await adminSupabase
      .from('user_role_groups')
      .insert(rows)

    if (roleError) {
      await adminSupabase.from('profiles').delete().eq('id', newUserId)
      await adminSupabase.auth.admin.deleteUser(newUserId)

      return NextResponse.json(
        { error: roleError.message || 'Failed to assign role groups' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json({ success: true })
}