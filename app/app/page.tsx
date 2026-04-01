import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppPage() {
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

  if (error || !profile || !profile.is_active) {
    redirect('/login')
  }

  if (profile.access_role === 'admin') {
    redirect('/app/admin')
  }

  redirect('/app/employee')
}