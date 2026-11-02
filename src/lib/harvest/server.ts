import { createClient } from '@/lib/supabase/server'
import type { HarvestListing } from './shared'

export const HARVEST_COLUMNS = 'id,seller_id,title,description,variety,location,quantity_kg,price_per_kg,harvest_date,contact,image_paths,status,moderation_note,created_at,updated_at'
export class HarvestError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return
  try {
    const url = new URL(origin)
    if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.host === (request.headers.get('host') || new URL(request.url).host)) return
  } catch { /* Reject malformed origins. */ }
  throw new HarvestError('Asal permintaan tidak diizinkan.', 403)
}
export async function harvestSession(request?: Request) {
  if (request) requireSameOrigin(request)
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new HarvestError('Silakan masuk untuk membuka informasi panen.', 401)
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role,full_name').eq('id', user.id).single()
  if (profileError || !profile || !['admin', 'petani'].includes(profile.role)) throw new HarvestError('Akun PM tidak memiliki akses.', 403)
  return { supabase, user, profile }
}
export async function readJson(request: Request) {
  if (Number(request.headers.get('content-length')) > 16000) throw new HarvestError('Data penawaran terlalu besar.', 413)
  const body = await request.text()
  if (body.length > 16000) throw new HarvestError('Data penawaran terlalu besar.', 413)
  try { const value = JSON.parse(body); if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown> } catch { /* Invalid JSON. */ }
  throw new HarvestError('Format data tidak valid.')
}
export function harvestFailure(error: unknown) {
  return Response.json({ error: error instanceof HarvestError ? error.message : 'Layanan panen belum dapat diakses. Silakan coba lagi.' }, { status: error instanceof HarvestError ? error.status : 500, headers: { 'Cache-Control': 'private, no-store' } })
}
export function harvestSuccess(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}
export async function readListing(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<HarvestListing> {
  const { data, error } = await supabase.from('harvest_listings').select(HARVEST_COLUMNS).eq('id', id).maybeSingle()
  if (error) throw new HarvestError('Data panen belum dapat dibaca. Pastikan migrasi Harvest Listing PM sudah diterapkan.', 503)
  if (!data) throw new HarvestError('Penawaran tidak ditemukan atau tidak dapat diakses.', 404)
  return data as HarvestListing
}
