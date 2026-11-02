import { HARVEST_BUCKET, nextHarvestStatus, photoPathIsOwned, validUuid, validateHarvestInput, type HarvestAction } from '@/lib/harvest/shared'
import { harvestSession, readJson, readListing, HarvestError, HARVEST_COLUMNS, harvestFailure, harvestSuccess } from '@/lib/harvest/server'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params
    if (!validUuid(id)) throw new HarvestError('ID penawaran tidak valid.')
    const { supabase, user, profile } = await harvestSession()
    const row = await readListing(supabase, id)
    return harvestSuccess({ data: row, user_id: user.id, role: profile.role })
  } catch (error) { return harvestFailure(error) }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params
    if (!validUuid(id)) throw new HarvestError('ID penawaran tidak valid.')
    const { supabase, user, profile } = await harvestSession(request), body = await readJson(request)
    const row = await readListing(supabase, id)
    const action = body.action as HarvestAction, owner = row.seller_id === user.id
    const next = nextHarvestStatus(row.status, action, owner, profile.role === 'admin')
    if (!next) throw new HarvestError('Tindakan ini tidak diizinkan untuk status penawaran saat ini.', 403)
    if (body.updated_at !== row.updated_at) throw new HarvestError('Penawaran sudah berubah. Muat ulang sebelum melanjutkan.', 409)
    let fields = {}
    if (body.data !== undefined) {
      if (!owner || !['save', 'submit'].includes(action)) throw new HarvestError('Perubahan data hanya dapat dilakukan pemilik.', 403)
      const result = validateHarvestInput(body.data)
      if (!result.data) throw new HarvestError(result.error!)
      fields = result.data
    }
    let removed: string | null = null
    if (action === 'remove_photo') {
      if (!Number.isInteger(body.index) || Number(body.index) < 0 || Number(body.index) >= row.image_paths.length) throw new HarvestError('Foto tidak ditemukan.')
      removed = row.image_paths[Number(body.index)]
      fields = { image_paths: row.image_paths.filter((_, index) => index !== body.index) }
    }
    if (['submit', 'publish'].includes(action) && !row.image_paths.length) throw new HarvestError('Tambahkan sedikitnya satu foto panen sebelum diajukan atau dipublikasikan.')
    const note = typeof body.moderation_note === 'string' ? body.moderation_note.trim() : ''
    if (action === 'hide' && (note.length < 5 || note.length > 500)) throw new HarvestError('Berikan alasan perbaikan 5–500 karakter.')
    const { data, error } = await supabase.from('harvest_listings').update({ ...fields, status: next, moderation_note: action === 'hide' ? note : ['submit', 'publish'].includes(action) ? null : row.moderation_note }).eq('id', id).eq('updated_at', row.updated_at).select(HARVEST_COLUMNS).maybeSingle()
    if (error) throw new HarvestError('Perubahan gagal disimpan. Periksa kembali status dan hak akses.', 422)
    if (!data) throw new HarvestError('Penawaran telah berubah. Muat ulang dahulu.', 409)
    if (removed && photoPathIsOwned(removed, row)) await supabase.storage.from(HARVEST_BUCKET).remove([removed])
    return harvestSuccess({ data })
  } catch (error) { return harvestFailure(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params
    if (!validUuid(id)) throw new HarvestError('ID penawaran tidak valid.')
    const { supabase, user } = await harvestSession(request), body = await readJson(request), row = await readListing(supabase, id)
    if (row.seller_id !== user.id || !['draft', 'hidden', 'sold'].includes(row.status)) throw new HarvestError('Hanya draf, penawaran perlu perbaikan, atau panen habis milik sendiri yang dapat dihapus.', 403)
    if (body.updated_at !== row.updated_at) throw new HarvestError('Penawaran sudah berubah. Muat ulang dahulu.', 409)
    const { data, error } = await supabase.from('harvest_listings').delete().eq('id', id).eq('updated_at', row.updated_at).select('id').maybeSingle()
    if (error) throw new HarvestError('Penawaran gagal dihapus.', 500)
    if (!data) throw new HarvestError('Penawaran sudah berubah.', 409)
    const paths = row.image_paths.filter(p => photoPathIsOwned(p, row))
    if (paths.length) await supabase.storage.from(HARVEST_BUCKET).remove(paths)
    return harvestSuccess({ deleted: true })
  } catch (error) { return harvestFailure(error) }
}
