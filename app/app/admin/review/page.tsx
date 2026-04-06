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
  notes: string | null
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

type NotAvailableRow = {
  shift_id: number
  user_id: string
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
    .select('id, shift_label, shift_date, held_by, employee_off, role_group_id, status, notes')
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

  const shiftIds = shifts.map((shift) => shift.id)

  let notAvailableRows: NotAvailableRow[] = []
  let notAvailableMap = new Map<number, number>()

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

    const { data: notAvailableData } = await supabase
      .from('shift_not_available')
      .select('shift_id, user_id')
      .in('shift_id', shiftIds)

    notAvailableRows = (notAvailableData ?? []) as NotAvailableRow[]
  }

  const claimantIds = [
    ...new Set(shifts.map((s) => s.held_by).filter(Boolean)),
  ] as string[]

  const notAvailableUserIds = [
    ...new Set(notAvailableRows.map((row) => row.user_id)),
  ]

  const allProfileIds = [...new Set([...claimantIds, ...notAvailableUserIds])]

  let profileMap = new Map<string, string>()

  if (allProfileIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', allProfileIds)

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

  const notAvailableNamesByShift = new Map<number, string[]>()

  for (const row of notAvailableRows) {
    const current = notAvailableNamesByShift.get(row.shift_id) ?? []
    const name = profileMap.get(row.user_id) ?? 'Unknown'
    current.push(name)
    notAvailableNamesByShift.set(row.shift_id, current)
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
          {shifts.map((shift) => {
            const notAvailableNames = notAvailableNamesByShift.get(shift.id) ?? []

            return (
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

                  {notAvailableNames.length > 0 ? (
                    <p className="text-sm text-slate-600">
                      Not Available By: {notAvailableNames.join(', ')}
                    </p>
                  ) : null}

                  {shift.notes ? (
                    <p className="text-sm text-slate-600">
                      Notes: {shift.notes}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4">
                  <ReviewActions shiftId={shift.id} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}