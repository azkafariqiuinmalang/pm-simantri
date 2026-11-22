import { isUuid, validateFarmPlan } from '@/lib/farm-plans/shared'
import { PLAN_COLUMNS, PlanError, planSession, planJson, planSuccess, planFailure, readPlan } from '@/lib/farm-plans/server'

type Context = { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  try {
    const { supabase, user } = await planSession()
    const { id } = await context.params
    return planSuccess({ data: await readPlan(supabase, user.id, id) })
  } catch (error) { return planFailure(error) }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { supabase, user } = await planSession(request)
    const { id } = await context.params
    if (!isUuid(id)) throw new PlanError('ID rencana tidak valid.')
    const body = await planJson(request)
    const current = await readPlan(supabase, user.id, id)
    if (body.version !== current.version) throw new PlanError('Rencana sudah berubah. Muat ulang untuk mengambil perubahan terbaru.', 409)
    const result = validateFarmPlan(body.data)
    if (!result.data) throw new PlanError(result.error!)
    const { data, error } = await supabase.from('farm_plans').update(result.data).eq('id', id).eq('owner_id', user.id).eq('version', current.version).select(PLAN_COLUMNS).maybeSingle()
    if (error) throw new PlanError('Perubahan gagal disimpan. Periksa rincian dan coba lagi.', 422)
    if (!data) throw new PlanError('Rencana sudah berubah. Muat ulang sebelum menyimpan kembali.', 409)
    return planSuccess({ data })
  } catch (error) { return planFailure(error) }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { supabase, user } = await planSession(request)
    const { id } = await context.params
    if (!isUuid(id)) throw new PlanError('ID rencana tidak valid.')
    const current = await readPlan(supabase, user.id, id), body = await planJson(request)
    if (body.version !== current.version) throw new PlanError('Rencana sudah berubah. Muat ulang dahulu.', 409)
    const { data, error } = await supabase.from('farm_plans').delete().eq('id', id).eq('owner_id', user.id).eq('version', current.version).select('id').maybeSingle()
    if (error) throw new PlanError('Rencana gagal dihapus.', 500)
    if (!data) throw new PlanError('Rencana sudah berubah. Muat ulang dahulu.', 409)
    return planSuccess({ deleted: true })
  } catch (error) { return planFailure(error) }
}
