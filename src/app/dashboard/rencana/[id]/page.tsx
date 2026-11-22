import { notFound } from 'next/navigation'
import PlanEditor from '@/components/farm-plans/PlanEditor'
import { PlanError, planSession, readPlan } from '@/lib/farm-plans/server'
import { isUuid } from '@/lib/farm-plans/shared'

export const metadata = { title: 'Catatan Usaha Tani | SIMANTRI' }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { supabase, user } = await planSession()
  let plan
  try { plan = await readPlan(supabase, user.id, id) }
  catch (error) {
    if (error instanceof PlanError && error.status === 404) notFound()
    return <section className="farm-panel"><h1 className="text-xl font-bold">Rencana belum dapat dimuat</h1><p className="farm-help mt-3">Periksa koneksi lalu muat ulang halaman. Catatan yang tersimpan tetap berada di akun pemilik.</p></section>
  }
  return <PlanEditor key={id} initial={plan} />
}
