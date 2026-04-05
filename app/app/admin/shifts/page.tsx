import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminShiftsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
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

  const { data: shifts } = await supabase
    .from('shifts')
    .select(`
      id,
      employee_off,
      shift_date,
      shift_label,
      status,
      notes,
      role_groups (
        label
      )
    `)
    .order('shift_date', { ascending: true })

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
          <Link
            href="/app/admin/shifts/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create Shift
          </Link>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {shifts?.map((shift) => (
                <tr key={shift.id}>
                  <td className="px-4 py-3">{shift.shift_date}</td>
                  <td className="px-4 py-3">{shift.employee_off}</td>
                  <td className="px-4 py-3">
                    {Array.isArray(shift.role_groups)
                      ? shift.role_groups[0]?.label
                      : (shift.role_groups as { label?: string } | null)?.label ?? ''}
                  </td>
                  <td className="px-4 py-3">{shift.shift_label}</td>
                  <td className="px-4 py-3">{shift.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}