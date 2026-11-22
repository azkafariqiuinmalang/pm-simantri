import { createClient } from '@/lib/supabase/server'
import { HarvestError, harvestSession, harvestSuccess, harvestFailure } from '@/lib/harvest/server'
import { isUuid, type FarmPlan } from './shared'

export { HarvestError as PlanError, harvestSession as planSession, harvestSuccess as planSuccess, harvestFailure as planFailure }
export const PLAN_COLUMNS = 'id,owner_id,name,mode,status,location,variety,area_m2,planting_date,harvest_date,expected_yield_kg,actual_yield_kg,sale_method,expected_price_per_kg,expected_total_sale,costs_confirmed,budget_items,expense_items,sales,version,created_at,updated_at'
export async function planJson(request: Request) {
  if (Number(request.headers.get('content-length')) > 65536) throw new HarvestError('Rincian rencana terlalu besar.', 413)
  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > 65536) throw new HarvestError('Rincian rencana terlalu besar.', 413)
  try {
    const json = JSON.parse(new TextDecoder().decode(bytes))
    if (json && typeof json === 'object' && !Array.isArray(json)) return json as Record<string, unknown>
  } catch { /* Invalid JSON is a client error. */ }
  throw new HarvestError('Format rencana tidak valid.')
}
type Client = Awaited<ReturnType<typeof createClient>>
export async function readPlan(supabase: Client, ownerId: string, id: string) {
  if (!isUuid(id)) throw new HarvestError('ID rencana tidak valid.')
  const { data, error } = await supabase.from('farm_plans').select(PLAN_COLUMNS).eq('owner_id', ownerId).eq('id', id).maybeSingle()
  if (error) throw new HarvestError('Rencana belum dapat dibaca. Periksa koneksi dan kesiapan database PM.', 503)
  if (!data) throw new HarvestError('Rencana tidak ditemukan atau tidak dapat diakses.', 404)
  return data as FarmPlan
}
export async function readPlans(supabase: Client, ownerId: string) {
  const { data, error } = await supabase.from('farm_plans').select(PLAN_COLUMNS).eq('owner_id', ownerId).order('updated_at', { ascending: false }).order('id').limit(40)
  if (error) throw new HarvestError('Daftar rencana belum dapat dimuat. Coba muat ulang halaman.', 503)
  return (data || []) as FarmPlan[]
}
