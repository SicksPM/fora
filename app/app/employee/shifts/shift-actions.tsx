'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function EmployeeShiftActions({
  shiftId,
  canClaim,
  isNotAvailable,
  isHeldByUser,
  status,
}: {
  shiftId: number
  canClaim: boolean
  isNotAvailable: boolean
  isHeldByUser: boolean
  status: string
}) {
  const router = useRouter()

  const [loadingAction, setLoadingAction] = useState<'claim' | 'not_available' | null>(null)
  const [error, setError] = useState('')

  const handleClaim = async () => {
    setLoadingAction('claim')
    setError('')

    const response = await fetch('/api/employee/shifts/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId }),
    })

    const result = await response.json()

    setLoadingAction(null)

    if (!response.ok) {
      setError(result.error || 'Failed to claim shift')
      return
    }

    router.refresh()
  }

  const handleNotAvailable = async () => {
    setLoadingAction('not_available')
    setError('')

    const response = await fetch('/api/employee/shifts/not-available', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift_id: shiftId }),
    })

    const result = await response.json()

    setLoadingAction(null)

    if (!response.ok) {
      setError(result.error || 'Failed to mark as not available')
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-3">
      {canClaim ? (
        <button
          type="button"
          onClick={handleClaim}
          disabled={loadingAction !== null}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loadingAction === 'claim' ? 'Claiming...' : 'Claim Shift'}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500"
        >
          {isNotAvailable
            ? 'Marked Not Available'
            : isHeldByUser && status === 'pending_hold'
            ? 'Pending Hold (You)'
            : status === 'pending_hold'
            ? 'Shift Pending Hold'
            : 'Not Available to Claim'}
        </button>
      )}

      {!isNotAvailable ? (
        <button
          type="button"
          onClick={handleNotAvailable}
          disabled={loadingAction !== null || isHeldByUser}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {loadingAction === 'not_available' ? 'Saving...' : 'Not Available'}
        </button>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}