import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AddShiftForm } from './shift-form'

type RoleGroup = {
  id: number
  label: string
}

type Employee = {
  id: string
  full_name: string
  email: string
  access_role: string
  is_active: boolean
  role_group_ids: number[]
}

export default async function NewShiftPage() {
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

  const { data: employeesData, error: employeesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, access_role, is_active')
    .eq('access_role', 'employee')
    .eq('is_active', true)
    .order('full_name', { ascending: true })

  if (employeesError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-red-700">
              Failed to load employees
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {employeesError.message}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const employeeIds = (employeesData ?? []).map((e) => e.id)

  let roleMap: { user_id: string; role_group_id: number }[] = []

  if (employeeIds.length > 0) {
    const { data: userRoleGroupsData, error: userRoleGroupsError } = await supabase
      .from('user_role_groups')
      .select('user_id, role_group_id')
      .in('user_id', employeeIds)

    if (userRoleGroupsError) {
      return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-3xl px-6 py-12">
            <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
              <h1 className="text-2xl font-semibold text-red-700">
                Failed to load employee role groups
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {userRoleGroupsError.message}
              </p>
            </div>
          </div>
        </main>
      )
    }

    roleMap = userRoleGroupsData ?? []
  }

  const employees: Employee[] = (employeesData ?? []).map((employee) => ({
    id: employee.id,
    full_name: employee.full_name,
    email: employee.email,
    access_role: employee.access_role,
    is_active: employee.is_active,
    role_group_ids: roleMap
      .filter((r) => r.user_id === employee.id)
      .map((r) => r.role_group_id),
  }))

  const roleGroups: RoleGroup[] = (roleGroupsData ?? []).map((role) => ({
    id: role.id,
    label: role.label,
  }))

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Create Shift</h1>
          <p className="mt-1 text-sm text-slate-500">
            Post a new coverage opportunity
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <AddShiftForm roleGroups={roleGroups} employees={employees} />
        </div>
      </div>
    </main>
  )
}