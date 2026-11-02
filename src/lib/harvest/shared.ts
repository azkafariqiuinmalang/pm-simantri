export const HARVEST_STATUSES = ['draft', 'pending', 'published', 'sold', 'hidden'] as const
export type HarvestStatus = typeof HARVEST_STATUSES[number]
export const STATUS_LABELS: Record<HarvestStatus, string> = { draft: 'Draf', pending: 'Menunggu moderasi', published: 'Aktif tayang', sold: 'Terjual / habis', hidden: 'Perlu perbaikan' }
export const HARVEST_BUCKET = 'pm-harvest'
export const MAX_PHOTOS = 3
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024
export const VARIETIES = ['Tajuk', 'Bauji', 'Bima Brebes', 'Batu Ijo', 'Super Philip', 'Lainnya']
export interface HarvestListing {
  id: string; seller_id: string; title: string; description: string; variety: string | null; location: string
  quantity_kg: number; price_per_kg: number; harvest_date: string | null; contact: string
  image_paths: string[]; status: HarvestStatus; moderation_note: string | null; created_at: string; updated_at: string
}
export type HarvestInput = Pick<HarvestListing, 'title' | 'description' | 'variety' | 'location' | 'quantity_kg' | 'price_per_kg' | 'harvest_date' | 'contact'>
export const rupiah = (n: number) => 'Rp' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
export const kilograms = (n: number) => Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' kg'
export const validUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
export function normalizeContact(value: string) {
  let phone = value.replace(/[\s()+.-]/g, '')
  if (phone.startsWith('0')) phone = '62' + phone.slice(1)
  return /^628\d{7,11}$/.test(phone) ? phone : null
}
export function validateHarvestInput(value: unknown): { data?: HarvestInput; error?: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Format penawaran tidak valid.' }
  const v = value as Record<string, unknown>
  const text = (key: string) => typeof v[key] === 'string' ? (v[key] as string).trim() : ''
  const title = text('title'), location = text('location'), description = text('description'), variety = text('variety')
  if (title.length < 3 || title.length > 200) return { error: 'Judul harus 3–200 karakter.' }
  if (location.length < 3 || location.length > 300) return { error: 'Isi lokasi panen (3–300 karakter).' }
  if (description.length > 3000 || variety.length > 100) return { error: 'Deskripsi atau varietas terlalu panjang.' }
  const number = (key: string) => typeof v[key] === 'number' ? v[key] as number : NaN
  const quantity_kg = number('quantity_kg'), price_per_kg = number('price_per_kg')
  if (![quantity_kg, price_per_kg].every(n => Number.isFinite(n) && n > 0 && n <= 1_000_000_000 && Math.abs(n * 100 - Math.round(n * 100)) < 0.0001)) return { error: 'Stok dan harga wajib positif, maksimal 1 miliar, dengan paling banyak dua angka desimal.' }
  const contact = normalizeContact(text('contact'))
  if (!contact) return { error: 'Isi nomor WhatsApp Indonesia yang valid, diawali 08 atau +62.' }
  const harvest_date = text('harvest_date') || null
  if (harvest_date && (!/^\d{4}-\d{2}-\d{2}$/.test(harvest_date) || !Number.isFinite(Date.parse(harvest_date)) || new Date(harvest_date).toISOString().slice(0, 10) !== harvest_date)) return { error: 'Tanggal panen tidak valid.' }
  return { data: { title, location, description, variety: variety || null, quantity_kg, price_per_kg, contact, harvest_date } }
}
export type HarvestAction = 'save' | 'submit' | 'withdraw' | 'sold' | 'publish' | 'hide' | 'remove_photo'
export function nextHarvestStatus(current: HarvestStatus, action: HarvestAction, owner: boolean, admin: boolean): HarvestStatus | null {
  if (admin && action === 'publish' && current === 'pending') return 'published'
  if (admin && action === 'hide' && ['pending', 'published'].includes(current)) return 'hidden'
  if (!owner) return null
  if (action === 'save') return 'draft'
  if (action === 'submit' && current !== 'pending') return 'pending'
  if (action === 'withdraw' && ['pending', 'published'].includes(current)) return 'draft'
  if (action === 'sold' && current === 'published') return 'sold'
  if (action === 'remove_photo' && current === 'draft') return 'draft'
  return null
}
export function photoPathIsOwned(path: string, row: Pick<HarvestListing, 'seller_id' | 'id'>) {
  return path.startsWith(`${row.seller_id}/${row.id}/`) && /^[0-9a-f/-]+\.(jpg|png|webp)$/.test(path)
}
export function photoMime(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' }
  if ([137,80,78,71,13,10,26,10].every((n, i) => bytes[i] === n)) return { mime: 'image/png', extension: 'png' }
  if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return { mime: 'image/webp', extension: 'webp' }
  return null
}
