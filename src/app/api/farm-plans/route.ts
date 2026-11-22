import { validateFarmPlan } from '@/lib/farm-plans/shared'
import { PLAN_COLUMNS, PlanError, planSession, planJson, planSuccess, planFailure, readPlans } from '@/lib/farm-plans/server'

export async function GET() {
  try {
    const { supabase, user } = await planSession()
    return planSuccess({ data: await readPlans(supabase, user.id) })
  } catch (error) { return planFailure(error) }
}
export async function POST(request: Request) {
  try {
    const { supabase, user } = await planSession(request)
    const result = validateFarmPlan(await planJson(request))
    if (!result.data) throw new PlanError(result.error!)
    const { data, error } = await supabase.from('farm_plans').insert({ ...result.data, owner_id: user.id }).select(PLAN_COLUMNS).single()
    if (error) throw new PlanError('Rencana gagal disimpan. Periksa koneksi dan coba lagi.', 503)
    return planSuccess({ data }, 201)
  } catch (error) { return planFailure(error) }
}
