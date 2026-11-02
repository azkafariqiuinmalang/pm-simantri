import { randomUUID } from 'node:crypto'
import { HARVEST_BUCKET, MAX_PHOTOS, MAX_PHOTO_BYTES, photoMime, photoPathIsOwned, validUuid } from '@/lib/harvest/shared'
import { harvestSession, readListing, HARVEST_COLUMNS, HarvestError, harvestFailure, harvestSuccess } from '@/lib/harvest/server'

type Context = { params: Promise<{ id: string }> }
export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params
    if (!validUuid(id)) throw new HarvestError('ID penawaran tidak valid.')
    const { supabase, user } = await harvestSession(request), row = await readListing(supabase, id)
    if (row.seller_id !== user.id || row.status !== 'draft') throw new HarvestError('Foto hanya dapat ditambahkan ke draf milik sendiri.', 403)
    if (request.headers.get('if-unmodified-since') !== row.updated_at) throw new HarvestError('Draf sudah berubah. Muat ulang dahulu.', 409)
    if (row.image_paths.length >= MAX_PHOTOS) throw new HarvestError('Maksimal tiga foto panen.')
    const length = Number(request.headers.get('content-length'))
    if (!length || length > MAX_PHOTO_BYTES) throw new HarvestError('Ukuran foto maksimal 3 MB.', 413)
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (bytes.length > MAX_PHOTO_BYTES || !bytes.length) throw new HarvestError('Ukuran foto tidak valid.', 413)
    const format = photoMime(bytes)
    if (!format || request.headers.get('content-type') !== format.mime) throw new HarvestError('Gunakan berkas JPG, PNG, atau WebP yang valid.')
    const path = `${user.id}/${id}/${randomUUID()}.${format.extension}`
    const { error } = await supabase.storage.from(HARVEST_BUCKET).upload(path, bytes, { contentType: format.mime, upsert: false, cacheControl: '0' })
    if (error) throw new HarvestError('Foto belum terunggah. Periksa koneksi dan konfigurasi penyimpanan PM. Draf tetap tersimpan.', 503)
    const { data, error: updateError } = await supabase.from('harvest_listings').update({ image_paths: [...row.image_paths, path] }).eq('id', id).eq('updated_at', row.updated_at).select(HARVEST_COLUMNS).maybeSingle()
    if (updateError || !data) {
      await supabase.storage.from(HARVEST_BUCKET).remove([path])
      throw new HarvestError('Draf berubah saat foto diunggah. Muat ulang dan coba lagi.', 409)
    }
    return harvestSuccess({ data }, 201)
  } catch (error) { return harvestFailure(error) }
}
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params
    if (!validUuid(id)) throw new HarvestError('ID penawaran tidak valid.')
    const { supabase } = await harvestSession(), row = await readListing(supabase, id)
    const index = Number(new URL(request.url).searchParams.get('index') || 0)
    if (!Number.isInteger(index) || index < 0 || index >= row.image_paths.length) throw new HarvestError('Foto tidak ditemukan.', 404)
    const path = row.image_paths[index]
    if (!photoPathIsOwned(path, row)) throw new HarvestError('Jalur foto tidak valid.', 404)
    const { data, error } = await supabase.storage.from(HARVEST_BUCKET).download(path)
    if (error || !data) throw new HarvestError('Foto belum dapat dimuat.', 404)
    const mime = path.endsWith('.png') ? 'image/png' : path.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
    return new Response(data, { headers: { 'Content-Type': mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" } })
  } catch (error) { return harvestFailure(error) }
}
