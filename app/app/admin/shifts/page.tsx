import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type Shift = {
  id: number
  employee_off: string
  shift_date: string
  shift_label: string
  status: string
  notes: string | null
  role_group_id: number
  held_by: string | null
  confirmed_user_id: string | null
}

type RoleGroup = {
  id: number
  label: string
}

type NotAvailableCount = {
  shift_id: number
  count: number
}

type Profile = {
  id: string
  full_name: string
}

export default async function AdminShiftsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.is_active || profile.access_role !== 'admin') {
    redirect('/login')
  }

  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select(
      'id, employee_off, shift_date, shift_label, status, notes, role_group_id, held_by, confirmed_user_id'
    )
    .order('shift_date', { ascending: true })

  if (shiftsError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
        <p>Error loading shifts: {shiftsError.message}</p>
      </main>
    )
  }

  const shifts: Shift[] = (shiftsData ?? []) as Shift[]

  const roleGroupIds = [...new Set(shifts.map((shift) => shift.role_group_id))]

  let roleGroups: RoleGroup[] = []

  if (roleGroupIds.length > 0) {
    const { data: roleGroupsData } = await supabase
      .from('role_groups')
      .select('id, label')
      .in('id', roleGroupIds)

    roleGroups = (roleGroupsData ?? []) as RoleGroup[]
  }

  const roleGroupMap = new Map<number, string>(
    roleGroups.map((role) => [role.id, role.label])
  )

  let notAvailableMap = new Map<number, number>()

  const shiftIds = shifts.map((shift) => shift.id)

  if (shiftIds.length > 0) {
    const { data: countsData } = await supabase
      .from('shift_not_available_counts')
      .select('shift_id, count')
      .in('shift_id', shiftIds)

    const counts: NotAvailableCount[] = (countsData ?? []).map((row: any) => ({
      shift_id: row.shift_id,
      count: Number(row.count),
    }))

    notAvailableMap = new Map(
      counts.map((countRow) => [countRow.shift_id, countRow.count])
    )
  }

  const profileIds = [
    ...new Set(
      shifts
        .flatMap((shift) => [shift.held_by, shift.confirmed_user_id])
        .filter(Boolean)
    ),
  ] as string[]

  let profileMap = new Map<string, string>()

  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', profileIds)

    const profiles: Profile[] = (profilesData ?? []) as Profile[]

    profileMap = new Map(
      profiles.map((p) => [p.id, p.full_name])
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Shifts</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage open coverage opportunities
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/app/admin/review"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Review Claims
            </Link>
            <Link
              href="/app/admin/shifts/new"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Create Shift
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Employee Off</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Shift</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Held By</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Confirmed</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Not Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td className="px-4 py-3">{shift.shift_date}</td>
                  <td className="px-4 py-3">{shift.employee_off}</td>
                  <td className="px-4 py-3">
                    {roleGroupMap.get(shift.role_group_id) ?? ''}
                  </td>
                  <td className="px-4 py-3">{shift.shift_label}</td>
                  <td className="px-4 py-3">{shift.status}</td>
                  <td className="px-4 py-3">
                    {shift.held_by ? profileMap.get(shift.held_by) ?? 'Unknown' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {shift.confirmed_user_id
                      ? profileMap.get(shift.confirmed_user_id) ?? 'Unknown'
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {notAvailableMap.get(shift.id) ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}