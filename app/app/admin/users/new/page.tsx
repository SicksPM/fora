import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddUserForm } from './user-form'

type RoleGroup = {
  id: number
  label: string
}

export default async function NewUserPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.access_role !== 'admin'
  ) {
    redirect('/login')
  }

  const { data: roleGroupsData, error: roleGroupsError } = await supabase
    .from('role_groups')
    .select('id, label')
    .order('label', { ascending: true })

  if (roleGroupsError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-red-700">
              Failed to load role groups
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {roleGroupsError.message}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const roleGroups: RoleGroup[] = (roleGroupsData ?? []).map((role) => ({
    id: role.id,
    label: role.label,
  }))

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Add User</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a new FORA admin or employee
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <AddUserForm roleGroups={roleGroups} />
        </div>
      </div>
    </main>
  )
}