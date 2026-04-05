import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

export default async function EmployeePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, access_role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (
    error ||
    !profile ||
    !profile.is_active ||
    profile.access_role !== 'employee'
  ) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">FORA</h1>
            <p className="mt-1 text-sm text-slate-500">Employee dashboard</p>
          </div>
          <LogoutButton />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <h2 className="text-2xl font-semibold">Employee Area</h2>
          <p className="mt-4 text-slate-600">
            Signed in as {profile.full_name}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Access role: {profile.access_role}
          </p>

          <div className="mt-8">
            <Link
              href="/app/employee/shifts"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              View My Shifts
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}