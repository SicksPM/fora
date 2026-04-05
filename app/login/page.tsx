import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function login(formData: FormData) {
  'use server'

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=invalid-login')
  }

  redirect('/app')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const hasError = params?.error === 'invalid-login'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight">FORA</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to access the platform.
          </p>

          <form action={login} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                name="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Password</label>
              <input
                type="password"
                name="password"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                required
              />
            </div>

            {hasError ? (
              <p className="text-sm text-red-600">
                Invalid email or password.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}