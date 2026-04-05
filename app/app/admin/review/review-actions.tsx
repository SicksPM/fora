'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export function ReviewActions({ shiftId }: { shiftId: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handle = async (action: 'approve' | 'reject') => {
    startTransition(async () => {
      await fetch('/api/admin/shifts/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shiftId, action }),
      })

      router.refresh()
    })
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handle('approve')}
        disabled={isPending}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      >
        Approve
      </button>

      <button
        onClick={() => handle('reject')}
        disabled={isPending}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  )
}