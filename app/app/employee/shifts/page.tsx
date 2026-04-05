import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'
import { EmployeeShiftActions } from './shift-actions'

type ShiftRow = {
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

type VisibleRow = {
  shift_id: number
}

type RoleGroupRow = {
  id: number
  label: string
}

type NotAvailableRow = {
  shift_id: number
}

export default async function EmployeeShiftsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    profileError ||
    !profile ||
    !profile.is_active ||
    profile.access_role !== 'employee'
  ) {
    redirect('/login')
  }

  const { data: visibleRowsData, error: visibilityError } = await supabase
    .from('shift_visible_users')
    .select('shift_id')
    .eq('user_id', user.id)

  if (visibilityError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-red-700">
              Failed to load visible shifts
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {visibilityError.message}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const visibleRows: VisibleRow[] = (visibleRowsData ?? []) as VisibleRow[]
  const shiftIds = visibleRows.map((row) => row.shift_id)

  let shifts: ShiftRow[] = []

  if (shiftIds.length > 0) {
    const { data: shiftsData, error: shiftsError } = await supabase
      .from('shifts')
      .select(
        'id, employee_off, shift_date, shift_label, status, notes, role_group_id, held_by, confirmed_user_id'
      )
      .in('id', shiftIds)
      .order('shift_date', { ascending: true })

    if (shiftsError) {
      return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-5xl px-6 py-12">
            <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
              <h1 className="text-2xl font-semibold text-red-700">
                Failed to load shifts
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {shiftsError.message}
              </p>
            </div>
          </div>
        </main>
      )
    }

    shifts = (shiftsData ?? []) as ShiftRow[]
  }

  shifts = shifts.filter((shift) => {
    if (shift.status === 'confirmed') {
      return shift.confirmed_user_id === user.id
    }

    if (shift.status === 'pending_hold') {
      return shift.held_by === user.id
    }

    return true
  })

  const roleGroupIds = [...new Set(shifts.map((shift) => shift.role_group_id))]

  let roleGroups: RoleGroupRow[] = []

  if (roleGroupIds.length > 0) {
    const { data: roleGroupsData, error: roleGroupsError } = await supabase
      .from('role_groups')
      .select('id, label')
      .in('id', roleGroupIds)

    if (roleGroupsError) {
      return (
        <main className="min-h-screen bg-slate-50 text-slate-900">
          <div className="mx-auto max-w-5xl px-6 py-12">
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

    roleGroups = (roleGroupsData ?? []) as RoleGroupRow[]
  }

  const roleGroupMap = new Map<number, string>(
    roleGroups.map((role) => [role.id, role.label])
  )

  const { data: notAvailableRowsData, error: notAvailableError } = await supabase
    .from('shift_not_available')
    .select('shift_id')
    .eq('user_id', user.id)

  if (notAvailableError) {
    return (
      <main className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-red-700">
              Failed to load not available records
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {notAvailableError.message}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const notAvailableRows: NotAvailableRow[] = (notAvailableRowsData ?? []) as NotAvailableRow[]
  const notAvailableSet = new Set(notAvailableRows.map((row) => row.shift_id))

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Shifts</h1>
            <p className="mt-1 text-sm text-slate-500">
              Coverage opportunities assigned to you
            </p>
          </div>
          <LogoutButton />
        </div>

        {!shifts.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <p className="text-sm text-slate-500">
              No shifts are currently assigned to you.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => {
              const isNotAvailable = notAvailableSet.has(shift.id)
              const isHeldByUser = shift.held_by === user.id
              const isConfirmedForUser = shift.confirmed_user_id === user.id
              const isClaimable = shift.status === 'open' && !isNotAvailable

              return (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {shift.shift_label}
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {shift.shift_date} · {roleGroupMap.get(shift.role_group_id) ?? ''}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Employee Off: {shift.employee_off}
                      </p>
                      {shift.notes ? (
                        <p className="mt-2 text-sm text-slate-500">
                          Notes: {shift.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="min-w-[260px]">
                      <div className="mb-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          Status:{' '}
                          {isNotAvailable
                            ? 'Not Available'
                            : isConfirmedForUser && shift.status === 'confirmed'
                            ? 'Confirmed (You)'
                            : isHeldByUser && shift.status === 'pending_hold'
                            ? 'Pending Hold (You)'
                            : shift.status}
                        </span>
                      </div>

                      <EmployeeShiftActions
                        shiftId={shift.id}
                        canClaim={isClaimable}
                        isNotAvailable={isNotAvailable}
                        isHeldByUser={isHeldByUser}
                        status={shift.status}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}