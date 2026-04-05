'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type RoleGroup = {
  id: number
  label: string
}

export function AddUserForm({ roleGroups }: { roleGroups: RoleGroup[] }) {
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessRole, setAccessRole] = useState<'admin' | 'employee'>('employee')
  const [selectedRoleGroups, setSelectedRoleGroups] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleRoleGroup = (id: number) => {
    setSelectedRoleGroups((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        email,
        password,
        access_role: accessRole,
        role_group_ids: selectedRoleGroups,
      }),
    })

    const result = await response.json()

    setLoading(false)

    if (!response.ok) {
      setError(result.error || 'Failed to create user')
      return
    }

    router.push('/app/admin/users')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Full Name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Temporary Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Access Role</label>
        <select
          value={accessRole}
          onChange={(e) => setAccessRole(e.target.value as 'admin' | 'employee')}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium">Role Groups</label>
        <div className="grid grid-cols-2 gap-3">
          {roleGroups.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={selectedRoleGroups.includes(role.id)}
                onChange={() => toggleRoleGroup(role.id)}
              />
              <span className="text-sm">{role.label}</span>
            </label>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? 'Creating User...' : 'Create User'}
      </button>
    </form>
  )
}