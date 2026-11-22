export const COST_CATEGORIES = {
  seed: 'Benih', fertilizer: 'Pupuk', protection: 'Pengendalian hama & penyakit',
  labor: 'Tenaga kerja', irrigation: 'Pengairan', land: 'Lahan & alat',
  harvest: 'Panen', selling: 'Pengemasan & penjualan', other: 'Lainnya',
} as const
export type CostCategory = keyof typeof COST_CATEGORIES
export type PlanMode = 'planning' | 'selling'
export type SaleMethod = 'per_kg' | 'tebasan'
export interface CostItem {
  id: string; category: CostCategory; label: string; quantity: number; unit: string; unit_price: number; date: string | null
}
export interface SaleItem {
  id: string; date: string; method: SaleMethod; quantity_kg: number | null
  price_per_kg: number | null; total_price: number | null; note: string
}
export interface FarmPlanInput {
  name: string; mode: PlanMode; status: 'active' | 'completed'; location: string; variety: string
  area_m2: number | null; planting_date: string | null; harvest_date: string | null
  expected_yield_kg: number | null; actual_yield_kg: number | null
  sale_method: SaleMethod; expected_price_per_kg: number | null; expected_total_sale: number | null
  costs_confirmed: boolean; budget_items: CostItem[]; expense_items: CostItem[]; sales: SaleItem[]
}
export interface FarmPlan extends FarmPlanInput { id: string; owner_id: string; version: number; created_at: string; updated_at: string }
export const MAX_ITEMS = 80
export const money = (n: number) => 'Rp' + n.toLocaleString('id-ID', { maximumFractionDigits: 0 })
export const decimal = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 })
export const isUuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
export const dateIsValid = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
export const costAmount = (item: CostItem) => Math.round(item.quantity * item.unit_price)
export const quantityForArea = (per1000M2: number, areaM2: number) => Math.round(per1000M2 * areaM2 / 1000 * 100) / 100
export const saleAmount = (item: SaleItem) => item.method === 'tebasan' ? item.total_price! : Math.round(item.quantity_kg! * item.price_per_kg!)
export function emptyPlan(mode: PlanMode = 'planning'): FarmPlanInput {
  return { name: '', mode, status: 'active', location: '', variety: 'Tajuk', area_m2: null,
    planting_date: null, harvest_date: null, expected_yield_kg: null, actual_yield_kg: null,
    sale_method: 'per_kg', expected_price_per_kg: null, expected_total_sale: null,
    costs_confirmed: false, budget_items: [], expense_items: [], sales: [] }
}

/** Whole-rupiah amounts, quantities to two decimals; bounds keep all totals within safe JS integers. */
function numeric(v: unknown, max: number, allowZero = false, integer = false): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= (allowZero ? 0 : 0.01) && v <= max &&
    (integer ? Number.isInteger(v) : Math.abs(v * 100 - Math.round(v * 100)) < 0.00001)
}
export function validateFarmPlan(value: unknown): { data?: FarmPlanInput; error?: string } {
  const fail = (error: string) => ({ error })
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('Format rencana tidak valid.')
  const v = value as Record<string, unknown>
  const text = (key: string) => typeof v[key] === 'string' ? (v[key] as string).trim() : ''
  const name = text('name'), location = text('location'), variety = text('variety')
  if (name.length < 3 || name.length > 150) return fail('Nama rencana harus 3–150 karakter.')
  if (location.length > 200 || variety.length > 100) return fail('Lokasi atau varietas terlalu panjang.')
  if (!['planning', 'selling'].includes(String(v.mode)) || !['active', 'completed'].includes(String(v.status))) return fail('Jenis atau status rencana tidak valid.')
  if (!['per_kg', 'tebasan'].includes(String(v.sale_method))) return fail('Cara penjualan tidak valid.')
  if (typeof v.costs_confirmed !== 'boolean') return fail('Konfirmasi kelengkapan biaya tidak valid.')
  for (const [key, max, zero, integer] of [
    ['area_m2', 10_000_000, false, false], ['expected_yield_kg', 1_000_000, false, false],
    ['actual_yield_kg', 1_000_000, true, false], ['expected_price_per_kg', 100_000_000, false, true],
    ['expected_total_sale', 100_000_000_000, false, true],
  ] as const) {
    if (v[key] !== null && !numeric(v[key], max, zero, integer)) return fail(`Nilai ${key === 'area_m2' ? 'luas lahan' : key.includes('yield') ? 'hasil panen' : 'harga jual'} tidak valid. Gunakan angka positif dalam batas yang diizinkan.`)
  }
  if (v.mode === 'planning' && v.area_m2 === null) return fail('Isi luas lahan untuk perencanaan sebelum panen.')
  if (v.mode === 'selling' && v.actual_yield_kg === null) return fail('Isi jumlah panen siap jual; isi 0 jika tidak ada hasil yang dapat dijual.')
  for (const key of ['planting_date', 'harvest_date'] as const) if (v[key] !== null && !dateIsValid(v[key])) return fail('Tanggal tanam atau panen tidak valid.')
  if (v.planting_date && v.harvest_date && String(v.harvest_date) < String(v.planting_date)) return fail('Tanggal panen tidak boleh mendahului tanggal tanam.')
  const readCosts = (key: 'budget_items' | 'expense_items'): CostItem[] | string => {
    const rows = v[key]
    if (!Array.isArray(rows) || rows.length > MAX_ITEMS) return 'Maksimal 80 rincian untuk setiap daftar biaya.'
    const ids = new Set<string>(), data: CostItem[] = []
    for (const item of rows) {
      if (!item || typeof item !== 'object') return 'Rincian biaya tidak valid.'
      if (!isUuid(item.id) || ids.has(item.id)) return 'ID rincian biaya tidak valid atau berulang.'
      ids.add(item.id)
      if (!Object.hasOwn(COST_CATEGORIES, item.category) || typeof item.label !== 'string' || !item.label.trim() || item.label.trim().length > 120 || typeof item.unit !== 'string' || !item.unit.trim() || item.unit.trim().length > 30) return 'Isi kategori, nama biaya, dan satuannya dengan benar.'
      if (!numeric(item.quantity, 1_000_000) || !numeric(item.unit_price, 100_000_000_000, false, true) || costAmount(item) > 1_000_000_000_000) return 'Jumlah atau harga biaya tidak valid. Harga menggunakan rupiah bulat; jumlah maksimal dua desimal.'
      if (key === 'expense_items' ? !dateIsValid(item.date) : item.date !== null) return 'Tanggal pengeluaran wajib valid; anggaran tidak menggunakan tanggal transaksi.'
      data.push({ id: item.id, category: item.category, label: item.label.trim(), quantity: item.quantity, unit: item.unit.trim(), unit_price: item.unit_price, date: item.date })
    }
    return data
  }
  const budget_items = readCosts('budget_items'), expense_items = readCosts('expense_items')
  if (typeof budget_items === 'string') return fail(budget_items)
  if (typeof expense_items === 'string') return fail(expense_items)
  if (!Array.isArray(v.sales) || v.sales.length > MAX_ITEMS) return fail('Maksimal 80 catatan penjualan per rencana.')
  const ids = new Set<string>(), sales: SaleItem[] = []
  for (const item of v.sales) {
    if (!item || typeof item !== 'object' || !isUuid(item.id) || ids.has(item.id) || !dateIsValid(item.date) || !['per_kg', 'tebasan'].includes(item.method)) return fail('Catatan penjualan atau tanggalnya tidak valid.')
    ids.add(item.id)
    if (item.quantity_kg !== null && !numeric(item.quantity_kg, 1_000_000)) return fail('Berat penjualan harus positif, maksimal dua desimal.')
    if (item.method === 'per_kg' && (!numeric(item.quantity_kg, 1_000_000) || !numeric(item.price_per_kg, 100_000_000, false, true))) return fail('Penjualan per kg memerlukan berat dan harga rupiah bulat yang positif.')
    if (item.method === 'tebasan' && !numeric(item.total_price, 100_000_000_000, false, true)) return fail('Isi nilai kesepakatan tebasan dalam rupiah bulat yang positif.')
    if (typeof item.note !== 'string' || item.note.length > 300) return fail('Catatan penjualan maksimal 300 karakter.')
    sales.push({ id: item.id, date: item.date, method: item.method, quantity_kg: item.quantity_kg,
      price_per_kg: item.method === 'per_kg' ? item.price_per_kg : null,
      total_price: item.method === 'tebasan' ? item.total_price : null, note: item.note.trim() })
  }
  const knownSold = sales.reduce((sum, s) => sum + Math.round((s.quantity_kg || 0) * 100), 0)
  if (v.actual_yield_kg !== null && knownSold > Math.round(Number(v.actual_yield_kg) * 100)) return fail('Berat penjualan melebihi jumlah panen siap jual. Periksa catatan atau perbarui hasil panen.')
  if (v.status === 'completed' && (!v.costs_confirmed || v.actual_yield_kg === null)) return fail('Untuk menyelesaikan musim, isi hasil panen aktual dan konfirmasikan seluruh biaya sudah dicatat.')
  // An explicit allowlist prevents client claims such as owner_id, version or derived profit from being persisted.
  return { data: { name, location, variety, mode: v.mode as PlanMode, status: v.status as FarmPlanInput['status'],
    area_m2: v.area_m2 as number | null, planting_date: v.planting_date as string | null, harvest_date: v.harvest_date as string | null,
    expected_yield_kg: v.expected_yield_kg as number | null, actual_yield_kg: v.actual_yield_kg as number | null,
    sale_method: v.sale_method as SaleMethod, expected_price_per_kg: v.sale_method === 'per_kg' ? v.expected_price_per_kg as number | null : null,
    expected_total_sale: v.sale_method === 'tebasan' ? v.expected_total_sale as number | null : null,
    costs_confirmed: v.costs_confirmed, budget_items, expense_items, sales } }
}

export function calculatePlan(plan: FarmPlanInput) {
  const budget = plan.budget_items.reduce((sum, item) => sum + costAmount(item), 0)
  const spent = plan.expense_items.reduce((sum, item) => sum + costAmount(item), 0)
  const revenue = plan.sales.reduce((sum, item) => sum + saleAmount(item), 0)
  const categories = Object.entries(COST_CATEGORIES).map(([key, label]) => {
    const planned = plan.budget_items.filter(x => x.category === key).reduce((s, x) => s + costAmount(x), 0)
    const actual = plan.expense_items.filter(x => x.category === key).reduce((s, x) => s + costAmount(x), 0)
    return { key, label, planned, actual, remaining: Math.max(0, planned - actual), over: Math.max(0, actual - planned) }
  })
  const costsKnown = plan.costs_confirmed || plan.expense_items.length > 0
  const forecastCost = plan.costs_confirmed ? spent : plan.budget_items.length || plan.expense_items.length ? categories.reduce((s, c) => s + Math.max(c.planned, c.actual), 0) : null
  const soldKg = Math.round(plan.sales.reduce((s, x) => s + (x.quantity_kg || 0), 0) * 100) / 100
  const unknownSaleWeight = plan.sales.some(x => x.quantity_kg === null)
  const yieldKg = plan.actual_yield_kg ?? plan.expected_yield_kg
  const remainingKg = yieldKg === null || unknownSaleWeight ? null : Math.max(0, Math.round((yieldKg - soldKg) * 100) / 100)
  let forecastRevenue: number | null = null
  if (plan.status === 'completed') forecastRevenue = revenue
  else if (plan.sale_method === 'tebasan') forecastRevenue = plan.expected_total_sale === null ? null : Math.max(revenue, plan.expected_total_sale)
  else if (remainingKg !== null && (remainingKg === 0 || plan.expected_price_per_kg !== null)) forecastRevenue = revenue + Math.round(remainingKg * (plan.expected_price_per_kg || 0))
  const forecastProfit = forecastCost === null || forecastRevenue === null ? null : forecastRevenue - forecastCost
  const breakEvenPrice = forecastCost === null || !yieldKg || unknownSaleWeight ? null : Math.ceil(forecastCost / yieldKg)
  const requiredPrice = forecastCost === null || !remainingKg || plan.sale_method !== 'per_kg' ? null : Math.ceil(Math.max(0, forecastCost - revenue) / remainingKg)
  const scenarios = plan.status !== 'completed' && plan.sale_method === 'per_kg' && plan.expected_price_per_kg !== null && remainingKg !== null && forecastCost !== null
    ? [0.8, 1, 1.2].map(factor => {
      const price = Math.round(plan.expected_price_per_kg! * factor)
      const total = revenue + Math.round(remainingKg * price)
      return { factor, price, revenue: total, profit: total - forecastCost }
    }) : []
  return { budget, spent, revenue, forecastCost, forecastRevenue, forecastProfit,
    cashDifference: costsKnown ? revenue - spent : null,
    finalProfit: plan.status === 'completed' && plan.costs_confirmed ? revenue - spent : null,
    ratio: forecastCost && forecastRevenue !== null ? forecastRevenue / forecastCost : null,
    yieldKg, soldKg, unknownSaleWeight, remainingKg, breakEvenPrice, requiredPrice, categories, scenarios,
    costPerM2: forecastCost !== null && plan.area_m2 ? forecastCost / plan.area_m2 : null }
}
