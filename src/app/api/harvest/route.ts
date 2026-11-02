import { HARVEST_STATUSES, validateHarvestInput } from '@/lib/harvest/shared'
import { harvestSession, readJson, HarvestError, HARVEST_COLUMNS, harvestFailure, harvestSuccess } from '@/lib/harvest/server'

export async function GET(request: Request) {
  try {
    const { supabase, user, profile } = await harvestSession()
    const params = new URL(request.url).searchParams, scope = params.get('scope') || 'marketplace'
    if (!['marketplace', 'mine', 'admin'].includes(scope)) throw new HarvestError('Jenis daftar tidak valid.')
    if (scope === 'admin' && profile.role !== 'admin') throw new HarvestError('Hanya Admin yang dapat membuka moderasi.', 403)
    const page = Number(params.get('page') || 1)
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new HarvestError('Halaman tidak valid.')
    const status = params.get('status'), search = (params.get('q') || '').trim()
    if (status && !HARVEST_STATUSES.includes(status as typeof HARVEST_STATUSES[number])) throw new HarvestError('Status tidak valid.')
    if (search.length > 100) throw new HarvestError('Pencarian maksimal 100 karakter.')
    const size = 12
    let query = supabase.from('harvest_listings').select(HARVEST_COLUMNS, { count: 'exact' })
    if (scope === 'marketplace') query = query.eq('status', 'published')
    if (scope === 'mine') query = query.eq('seller_id', user.id)
    if (scope !== 'marketplace' && status) query = query.eq('status', status)
    // Restrict PostgREST filter syntax to ordinary search text, never interpolate operators.
    const term = search.replace(/[^\p{L}\p{N}\s-]/gu, '').trim()
    if (term) query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%,variety.ilike.%${term}%`)
    const variety = params.get('variety')
    if (variety && variety.length <= 100) query = query.eq('variety', variety)
    const sort = params.get('sort') || 'newest'
    if (!['newest', 'lowest', 'highest'].includes(sort)) throw new HarvestError('Urutan tidak valid.')
    const { data, count, error } = await query.order(sort === 'newest' ? 'created_at' : 'price_per_kg', { ascending: sort === 'lowest' }).order('id').range((page - 1) * size, page * size - 1)
    if (error) throw new HarvestError('Daftar panen belum dapat dimuat. Pastikan migrasi Harvest Listing PM sudah diterapkan.', 503)
    return harvestSuccess({ data: data || [], total: count || 0, page, page_size: size, user_id: user.id, role: profile.role })
  } catch (error) { return harvestFailure(error) }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await harvestSession(request)
    const body = await readJson(request), result = validateHarvestInput(body)
    if (!result.data) throw new HarvestError(result.error!)
    // Always create a draft. Upload real photos before requesting moderation.
    const { data, error } = await supabase.from('harvest_listings').insert({ ...result.data, seller_id: user.id, status: 'draft', image_paths: [] }).select(HARVEST_COLUMNS).single()
    if (error) throw new HarvestError('Draf belum tersimpan. Periksa koneksi dan kesiapan database PM.', 503)
    return harvestSuccess({ data }, 201)
  } catch (error) { return harvestFailure(error) }
}
