import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditShiftForm } from './shift-form'

type RoleGroup = {
  id: number
  label: string
}

type Shift = {
  id: number
  shift_date: string
  shift_label: string
  employee_off: string
  role_group_id: number
  notes: string | null
}

export default async function EditShiftPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.access_role !== 'admin') {
    redirect('/login')
  }

  const { data: shiftData, error: shiftError } = await supabase
    .from('shifts')
    .select('id, shift_date, shift_label, employee_off, role_group_id, notes')
    .eq('id', Number(id))
    .maybeSingle()

  if (shiftError || !shiftData) {
    return (
      <main className="p-8">
        <p>Shift not found</p>
      </main>
    )
  }

  const shift: Shift = shiftData as Shift

  const { data: roleGroupsData } = await supabase
    .from('role_groups')
    .select('id, label')
    .order('label', { ascending: true })

  const roleGroups: RoleGroup[] = (roleGroupsData ?? []) as RoleGroup[]

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-4">Edit Shift</h1>
        <EditShiftForm shift={shift} roleGroups={roleGroups} />
      </div>
    </main>
  )
}