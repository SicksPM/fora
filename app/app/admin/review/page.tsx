import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'
import { ReviewActions } from './review-actions'

type Shift = {
  id: number
  shift_label: string
  shift_date: string
  held_by: string | null
  employee_off: string
  role_group_id: number
  status: string
}

type Profile = {
  id: string
  full_name: string
}

type RoleGroup = {
  id: number
  label: string
}

type NotAvailableCount = {
  shift_id: number
  count: number
}

export default async function AdminReviewPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) redirect('/login')

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
    redirect('/login')
  }

  const { data: shiftsData, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, shift_label, shift_date, held_by, employee_off, role_group_id, status')
    .eq('status', 'pending_hold')
    .order('shift_date', { ascending: true })

  if (shiftsError) {
    return (
      <main className="p-8">
        <p>Error loading shifts: {shiftsError.message}</p>
      </main>
    )
  }

  const shifts: Shift[] = (shiftsData ?? []) as Shift[]

  let profileMap = new Map<string, string>()

  const userIds = [
    ...new Set(shifts.map((s) => s.held_by).filter(Boolean)),
  ] as string[]

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)

    const profilesTyped: Profile[] = (profiles ?? []) as Profile[]

    profileMap = new Map(profilesTyped.map((p) => [p.id, p.full_name]))
  }

  const roleGroupIds = [...new Set(shifts.map((shift) => shift.role_group_id))]

  let roleGroupMap = new Map<number, string>()

  if (roleGroupIds.length > 0) {
    const { data: roleGroups } = await supabase
      .from('role_groups')
      .select('id, label')
      .in('id', roleGroupIds)

    const roleGroupsTyped: RoleGroup[] = (roleGroups ?? []) as RoleGroup[]

    roleGroupMap = new Map(roleGroupsTyped.map((role) => [role.id, role.label]))
  }

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="flex justify-between mb-6 items-center">
        <div>
          <h1 className="text-2xl font-semibold">Review Shifts</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review pending claims from employees
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/app/admin/shifts"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Shifts
          </Link>
          <LogoutButton />
        </div>
      </div>

      {!shifts.length ? (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-600">No pending shifts</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"
            >
              <div className="space-y-1">
                <p className="text-lg font-semibold text-slate-900">
                  {shift.shift_label}
                </p>

                <p className="text-sm text-slate-700">
                  {shift.shift_date}
                </p>

                <p className="text-sm text-slate-700">
                  Employee Off: {shift.employee_off}
                </p>

                <p className="text-sm text-slate-700">
                  Role: {roleGroupMap.get(shift.role_group_id) ?? ''}
                </p>

                <p className="text-sm text-slate-700">
                  Held By:{' '}
                  {shift.held_by
                    ? profileMap.get(shift.held_by) ?? 'Unknown'
                    : '—'}
                </p>

                <p className="text-sm text-slate-600">
                  Not Available: {notAvailableMap.get(shift.id) ?? 0}
                </p>
              </div>

              <div className="mt-4">
                <ReviewActions shiftId={shift.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}