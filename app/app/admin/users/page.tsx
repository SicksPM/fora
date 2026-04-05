import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminUsersPage() {
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

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, access_role, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
            <p className="mt-1 text-sm text-slate-500">Create and manage FORA users</p>
          </div>
          <Link
            href="/app/admin/users/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add User
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Access Role</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">{u.access_role}</td>
                  <td className="px-4 py-3">{u.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}