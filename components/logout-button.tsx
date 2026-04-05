'use client'

export function LogoutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Logout
      </button>
    </form>
  )
}