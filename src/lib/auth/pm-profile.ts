import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requirePmProfile(adminOnly = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error || !profile || !['petani', 'admin'].includes(profile.role)) redirect('/login?reason=pm-role')
  if (adminOnly && profile.role !== 'admin') redirect('/dashboard')
  return profile
}
