import Link from 'next/link'
import PlanList from '@/components/farm-plans/PlanList'
import { planSession, readPlans } from '@/lib/farm-plans/server'

export const metadata = { title: 'Rencana Usaha Tani | SIMANTRI' }
export default async function Page() {
  const { supabase, user } = await planSession()
  let plans
  try { plans = await readPlans(supabase, user.id) }
  catch { return <section className="farm-panel"><h1 className="text-xl font-bold">Rencana belum dapat dimuat</h1><p className="farm-help mt-3">Periksa koneksi atau kesiapan database, lalu coba muat ulang.</p><Link href="/dashboard/rencana" className="farm-button mt-4">Muat ulang rencana</Link></section> }
  return <PlanList plans={plans} />
}
