'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

export function EditShiftForm({
  shift,
  roleGroups,
}: {
  shift: Shift
  roleGroups: RoleGroup[]
}) {
  const router = useRouter()

  const [shiftDate, setShiftDate] = useState(shift.shift_date)
  const [shiftLabel, setShiftLabel] = useState(shift.shift_label)
  const [employeeOff, setEmployeeOff] = useState(shift.employee_off)
  const [roleGroupId, setRoleGroupId] = useState(String(shift.role_group_id))
  const [notes, setNotes] = useState(shift.notes ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await fetch('/api/admin/shifts/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shift_id: shift.id,
        shift_date: shiftDate,
        shift_label: shiftLabel,
        employee_off: employeeOff,
        role_group_id: Number(roleGroupId),
        notes,
      }),
    })

    setLoading(false)
    router.push('/app/admin/shifts')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Shift Date</label>
        <input
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Shift Label</label>
        <input
          type="text"
          value={shiftLabel}
          onChange={(e) => setShiftLabel(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Employee Off</label>
        <input
          type="text"
          value={employeeOff}
          onChange={(e) => setEmployeeOff(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Role Group</label>
        <select
          value={roleGroupId}
          onChange={(e) => setRoleGroupId(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2"
        >
          {roleGroups.map((role) => (
            <option key={role.id} value={role.id}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-2"
          rows={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      >
        Save Changes
      </button>
    </form>
  )
}