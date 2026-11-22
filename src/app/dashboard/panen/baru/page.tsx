import HarvestForm from '@/components/harvest/HarvestForm'
import Link from 'next/link'
import { planSession, readPlan } from '@/lib/farm-plans/server'
import { calculatePlan, isUuid } from '@/lib/farm-plans/shared'

export default async function Page({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: id } = await searchParams
  if (!id) return <HarvestForm />
  if (!isUuid(id)) return <p role="alert">Rencana tidak valid.</p>
  const { supabase, user } = await planSession()
  let plan
  try { plan = await readPlan(supabase, user.id, id) }
  catch { return <section className="farm-panel"><h1 className="farm-section-title">Rencana tidak ditemukan atau tidak dapat diakses</h1><Link href="/dashboard/rencana" className="farm-text-link mt-4">Kembali ke rencana saya</Link></section> }
  const totals = calculatePlan(plan)
  if (plan.status === 'completed' || plan.actual_yield_kg === null || !totals.remainingKg) return <section className="farm-panel"><h1 className="farm-section-title">Lengkapi hasil panen terlebih dahulu</h1><p className="farm-help mt-3">Penawaran memerlukan hasil panen aktual dengan sisa berat yang diketahui dan masih tersedia.</p><Link className="farm-text-link mt-4" href={`/dashboard/rencana/${id}`}>Kembali ke rencana</Link></section>
  return <><p className="farm-notice mb-5">Informasi panen disalin dari rencana tersimpan. Periksa stok dan harga, lengkapi foto serta kontak, lalu simpan atau ajukan penawaran. Catatan biaya tetap pribadi. Penawaran tidak otomatis memperbarui catatan penjualan.</p><HarvestForm prefill={{ title: plan.name, location: plan.location, variety: plan.variety, quantity_kg: String(totals.remainingKg), price_per_kg: plan.sale_method === 'per_kg' && plan.expected_price_per_kg !== null ? String(plan.expected_price_per_kg) : '', harvest_date: plan.harvest_date || '' }} /></>
}
