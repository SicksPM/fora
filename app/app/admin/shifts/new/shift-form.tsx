'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export function AddShiftForm({
  roleGroups,
  employees,
}: {
  roleGroups: RoleGroup[]
  employees: Employee[]
}) {
  const router = useRouter()

  const [employeeOff, setEmployeeOff] = useState('')
  const [roleGroupId, setRoleGroupId] = useState('')
  const [shiftDate, setShiftDate] = useState('')
  const [shiftLabel, setShiftLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedVisibleUsers, setSelectedVisibleUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const numericRoleGroupId = Number(roleGroupId)

  const eligibleEmployees = useMemo(() => {
    if (!numericRoleGroupId) return []

    return employees.filter((employee) =>
      employee.role_group_ids.includes(numericRoleGroupId)
    )
  }, [employees, numericRoleGroupId])

  const handleRoleGroupChange = (value: string) => {
    setRoleGroupId(value)
    setSelectedVisibleUsers([])
  }

  const toggleVisibleUser = (userId: string) => {
    setSelectedVisibleUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const response = await fetch('/api/admin/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_off: employeeOff,
        role_group_id: Number(roleGroupId),
        shift_date: shiftDate,
        shift_label: shiftLabel,
        notes,
        visible_user_ids: selectedVisibleUsers,
      }),
    })

    const result = await response.json()

    setLoading(false)

    if (!response.ok) {
      setError(result.error || 'Failed to create shift')
      return
    }

    router.push('/app/admin/shifts')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium">Employee Off</label>
        <input
          type="text"
          value={employeeOff}
          onChange={(e) => setEmployeeOff(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Role Group</label>
        <select
          value={roleGroupId}
          onChange={(e) => handleRoleGroupChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        >
          <option value="">Select a role group</option>
          {roleGroups.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-3 block text-sm font-medium">
          Employees Who Can See This Shift
        </label>

        {!roleGroupId ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            Select a role group to load eligible employees.
          </div>
        ) : eligibleEmployees.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            No active employees are assigned to this role group.
          </div>
        ) : (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            {eligibleEmployees.map((employee) => (
              <label
                key={employee.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
              >
                <input
                  type="checkbox"
                  checked={selectedVisibleUsers.includes(employee.id)}
                  onChange={() => toggleVisibleUser(employee.id)}
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {employee.full_name}
                  </p>
                  <p className="text-xs text-slate-500">{employee.email}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Shift Date</label>
        <input
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Shift Label</label>
        <input
          type="text"
          value={shiftLabel}
          onChange={(e) => setShiftLabel(e.target.value)}
          placeholder="Example: 6AM - 2PM / Morning Joe"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          rows={4}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? 'Creating Shift...' : 'Create Shift'}
      </button>
    </form>
  )
}