'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  shiftId: number
  canClaim: boolean
  isNotAvailable: boolean
  isHeldByUser: boolean
  status: string
}

export function EmployeeShiftActions({
  shiftId,
  canClaim,
  isNotAvailable,
  isHeldByUser,
  status,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClaim = async () => {
    startTransition(async () => {
      await fetch('/api/employee/shifts/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId }),
      })

      router.refresh()
    })
  }

  const handleNotAvailable = async () => {
    startTransition(async () => {
      await fetch('/api/employee/shifts/not-available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId }),
      })

      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {canClaim && (
        <button
          onClick={handleClaim}
          disabled={isPending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Claim Shift
        </button>
      )}

      {!isNotAvailable && status === 'open' && (
        <button
          onClick={handleNotAvailable}
          disabled={isPending}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Not Available
        </button>
      )}

      {isHeldByUser && status === 'pending_hold' && (
        <button
          disabled
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500"
        >
          Pending Approval
        </button>
      )}

      {status === 'confirmed' && (
        <button
          disabled
          className="rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700"
        >
          Confirmed
        </button>
      )}
    </div>
  )
}