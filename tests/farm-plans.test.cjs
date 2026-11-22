/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness for financial calculations and guarded routes. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { randomUUID } = require('node:crypto')
function load(relative, overrides = {}) {
  const filename = path.resolve(relative), instance = new Module(filename, module)
  instance.filename = filename; instance.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = instance.require.bind(instance)
  instance.require = name => Object.hasOwn(overrides, name) ? overrides[name] : original(name)
  instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename)
  return instance.exports
}
const s = load('src/lib/farm-plans/shared.ts')
const cost = (amount, category = 'seed', actual = false) => ({ id: randomUUID(), category, label: 'Biaya uji', quantity: 1, unit: 'paket', unit_price: amount, date: actual ? '2026-11-21' : null })
const sale = (quantity, price) => ({ id: randomUUID(), method: 'per_kg', date: '2026-11-21', quantity_kg: quantity, price_per_kg: price, total_price: null, note: '' })
function plan(mode = 'planning') { return { ...s.emptyPlan(mode), name: 'Rencana Tajuk Rejoso', area_m2: 2000, actual_yield_kg: mode === 'selling' ? 1000 : null, expected_yield_kg: 1000, expected_price_per_kg: 20000 } }

test('area-based requirements scale user inputs without inventing an agronomic rate', () => {
  assert.equal(s.quantityForArea(50, 2000), 100)
  assert.equal(s.quantityForArea(50, 2500), 125)
  assert.equal(s.quantityForArea(2.35, 750), 1.76)
})

test('Plan 1 calculates 5.5m profit and 14,500/kg break-even from actual costs', () => {
  const p = { ...plan('selling'), expense_items: [cost(14500000, 'other', true)], costs_confirmed: true }
  const r = s.calculatePlan(p)
  assert.equal(r.forecastCost, 14500000); assert.equal(r.forecastRevenue, 20000000)
  assert.equal(r.forecastProfit, 5500000); assert.equal(r.breakEvenPrice, 14500)
  assert.equal(r.finalProfit, null); assert.equal(r.cashDifference, -14500000)
})
test('Plan 2 keeps unknown actual harvest separate from the forecast and converts area correctly', () => {
  const p = { ...plan(), budget_items: [cost(14500000)] }
  assert.ok(s.validateFarmPlan(p).data)
  const r = s.calculatePlan(p)
  assert.equal(r.yieldKg, 1000); assert.equal(r.costPerM2, 7250); assert.equal(p.area_m2 / 10000, 0.2)
  assert.equal(r.forecastProfit, 5500000); assert.equal(r.cashDifference, null)
})
test('incomplete costs, yields, and prices do not invent profitable results', () => {
  for (const p of [plan(), { ...plan(), expected_yield_kg: null, budget_items: [cost(5)] }, { ...plan(), expected_price_per_kg: null, budget_items: [cost(5)] }]) assert.equal(s.calculatePlan(p).forecastProfit, null)
  const r = s.calculatePlan({ ...plan(), costs_confirmed: true })
  assert.equal(r.forecastCost, 0); assert.equal(r.ratio, null)
})
test('a 0kg actual harvest overrides a positive forecast and can report a failed crop', () => {
  const p = { ...plan(), actual_yield_kg: 0, expense_items: [cost(4000000, 'seed', true)], costs_confirmed: true, status: 'completed' }
  assert.ok(s.validateFarmPlan(p).data)
  const r = s.calculatePlan(p)
  assert.equal(r.forecastRevenue, 0); assert.equal(r.finalProfit, -4000000); assert.equal(r.breakEvenPrice, null)
})
test('expenses replace the matching category budget rather than double-counting it', () => {
  const p = { ...plan(), budget_items: [cost(4000000, 'seed'), cost(2000000, 'fertilizer')], expense_items: [cost(3000000, 'seed', true)] }
  const r = s.calculatePlan(p)
  assert.equal(r.forecastCost, 6000000); assert.equal(r.spent, 3000000)
  assert.equal(r.categories.find(c => c.key === 'seed').remaining, 1000000)
})
test('over-budget categories increase forecast cost while other categories retain remaining budget', () => {
  const p = { ...plan(), budget_items: [cost(4000000, 'seed'), cost(2000000, 'fertilizer')], expense_items: [cost(5000000, 'seed', true)] }
  assert.equal(s.calculatePlan(p).forecastCost, 7000000)
  assert.equal(s.calculatePlan({ ...p, costs_confirmed: true }).forecastCost, 5000000)
})
test('partial sales use agreed revenue plus remaining stock at target price, never full yield twice', () => {
  const p = { ...plan('selling'), budget_items: [cost(14500000)], sales: [sale(400, 18000)] }
  const r = s.calculatePlan(p)
  assert.equal(r.revenue, 7200000); assert.equal(r.remainingKg, 600)
  assert.equal(r.forecastRevenue, 19200000); assert.equal(r.forecastProfit, 4700000)
  assert.equal(r.requiredPrice, Math.ceil(7300000 / 600))
})
test('completed seasons use recorded sales instead of the asking price or unsold crop', () => {
  const p = { ...plan('selling'), status: 'completed', costs_confirmed: true, expense_items: [cost(14500000, 'seed', true)], sales: [sale(900, 18000)] }
  const r = s.calculatePlan(p)
  assert.equal(r.remainingKg, 100); assert.equal(r.forecastRevenue, 16200000)
  assert.equal(r.finalProfit, 1700000); assert.equal(r.forecastProfit, 1700000)
})
test('tebasan uses the agreed total, and unknown sold weight does not invent stock or per-kg break-even', () => {
  const row = { id: randomUUID(), date: '2026-11-21', method: 'tebasan', quantity_kg: null, price_per_kg: null, total_price: 17000000, note: '' }
  const p = { ...plan('selling'), sale_method: 'tebasan', expected_total_sale: 18000000, budget_items: [cost(14500000)], sales: [row] }
  assert.ok(s.validateFarmPlan(p).data)
  const r = s.calculatePlan(p)
  assert.equal(r.revenue, 17000000); assert.equal(r.forecastRevenue, 18000000)
  assert.equal(r.forecastProfit, 3500000); assert.equal(r.remainingKg, null); assert.equal(r.breakEvenPrice, null)
  assert.equal(s.calculatePlan({ ...p, sale_method: 'per_kg' }).forecastRevenue, null)
})
test('price scenarios are +/-20% of user input and keep already recorded sales fixed', () => {
  const p = { ...plan('selling'), budget_items: [cost(14500000)], sales: [sale(400, 18000)] }
  const r = s.calculatePlan(p)
  assert.deepEqual(r.scenarios.map(x => [x.price, x.revenue]), [[16000,16800000],[20000,19200000],[24000,21600000]])
  assert.equal(s.calculatePlan({ ...p, status: 'completed' }).scenarios.length, 0)
})
test('whole-rupiah rounding and decimal stock do not fail on floating-point additions', () => {
  const p = { ...plan('selling'), actual_yield_kg: 0.3, sales: [sale(0.1, 20001), sale(0.2, 20001)] }
  assert.ok(s.validateFarmPlan(p).data); assert.equal(s.calculatePlan(p).remainingKg, 0)
  assert.equal(s.costAmount({ quantity: 1.25, unit_price: 15001 }), 18751)
})
test('validation strips ownership claims, version, and client-derived totals', () => {
  const data = s.validateFarmPlan({ ...plan(), owner_id: randomUUID(), version: 80, profit: 9000000 }).data
  assert.equal(data.owner_id, undefined); assert.equal(data.version, undefined); assert.equal(data.profit, undefined)
})
test('validation rejects nonfinite, string, negative, oversized and excess-precision numbers', () => {
  for (const patch of [{ area_m2: -1 }, { area_m2: Infinity }, { area_m2: '2000' }, { expected_yield_kg: NaN }, { expected_yield_kg: 1.001 }, { actual_yield_kg: -1 }, { expected_price_per_kg: 20000.5 }, { expected_total_sale: 100000000001 }]) assert.ok(s.validateFarmPlan({ ...plan(), ...patch }).error)
  for (const item of [cost(1.5), { ...cost(10), quantity: -1 }, { ...cost(10), category: '__proto__' }, { ...cost(10), quantity: 1000001 }, { ...cost(100000000000), quantity: 1000000 }]) assert.ok(s.validateFarmPlan({ ...plan(), budget_items: [item] }).error)
})
test('validation enforces planning area, harvested quantity, real dates and chronological planting', () => {
  for (const patch of [{ area_m2: null }, { planting_date: '2026-02-30' }, { planting_date: '2026-11-21', harvest_date: '2026-11-20' }, { expense_items: [{ ...cost(10, 'seed', true), date: '' }] }]) assert.ok(s.validateFarmPlan({ ...plan(), ...patch }).error)
  assert.ok(s.validateFarmPlan({ ...plan('selling'), actual_yield_kg: null }).error)
  assert.ok(s.validateFarmPlan({ ...plan('selling'), area_m2: null }).data)
})
test('duplicate entries, invalid sales and 81-item ledgers are rejected', () => {
  const c = cost(10)
  for (const patch of [{ budget_items: [c, c] }, { budget_items: Array.from({ length: 81 }, () => cost(10)) }, { sales: [sale(0, 18000)] }, { sales: [sale(2, 0)] }, { sales: [{ ...sale(2, 5), date: '2026-13-01' }] }, { sales: [sale(1, 5), ...[sale(1, 5)].map(x => ({ ...x, id: 'not-id' }))] }]) assert.ok(s.validateFarmPlan({ ...plan(), ...patch }).error)
})
test('overselling and incomplete finalization are rejected, including multiple-sale totals', () => {
  for (const patch of [{ sales: [sale(1001, 5)] }, { sales: [sale(600, 5), sale(500, 5)] }, { status: 'completed' }, { status: 'completed', costs_confirmed: true, actual_yield_kg: null }]) assert.ok(s.validateFarmPlan({ ...plan('selling'), ...patch }).error)
})

const harvestServer = load('src/lib/harvest/server.ts', { '@/lib/supabase/server': {} })
const backend = load('src/lib/farm-plans/server.ts', { '@/lib/supabase/server': {}, '@/lib/harvest/server': harvestServer, './shared': s })
test('private plan reads always constrain both owner and id, including admin accounts', async () => {
  const filters = [], id = randomUUID(), owner = randomUUID()
  const query = { select: () => query, eq: (key, value) => { filters.push([key,value]); return query }, maybeSingle: async () => ({ data: null, error: null }) }
  await assert.rejects(() => backend.readPlan({ from: () => query }, owner, id), e => e.status === 404)
  assert.deepEqual(filters, [['owner_id',owner],['id',id]])
})
test('plan JSON rejects malformed, array and oversized UTF-8 request bodies', async () => {
  for (const body of ['[]', '{', JSON.stringify({ text: '漢'.repeat(23000) })]) await assert.rejects(() => backend.planJson(new Request('http://localhost/api/farm-plans', { method: 'POST', body })), e => [400,413].includes(e.status))
})
test('anonymous plan API access returns 401 without leaking finance data', async () => {
  const helpers = { ...backend, planSession: async () => { throw new backend.PlanError('Silakan masuk.',401) } }
  const list = load('src/app/api/farm-plans/route.ts', { '@/lib/farm-plans/shared': s, '@/lib/farm-plans/server': helpers })
  const detail = load('src/app/api/farm-plans/[id]/route.ts', { '@/lib/farm-plans/shared': s, '@/lib/farm-plans/server': helpers })
  const req = new Request('http://localhost/api/farm-plans', { method:'POST', body:'{}' }), ctx = { params: Promise.resolve({ id: randomUUID() }) }
  for (const run of [() => list.GET(), () => list.POST(req), () => detail.GET(req,ctx), () => detail.PATCH(req,ctx), () => detail.DELETE(req,ctx)]) { const response = await run(); assert.equal(response.status,401); assert.match(response.headers.get('cache-control'),/no-store/) }
})
function detailFixture({ stale=false, raced=false }={}) {
  const id=randomUUID(),owner=randomUUID(), writes=[],filters=[]
  const current={...plan('selling'),id,owner_id:owner,version:3}
  const query={eq:(key,value)=>{filters.push([key,value]);return query},select:()=>query,maybeSingle:async()=>({data:raced?null:{...current,version:4},error:null})}
  const supabase={from:()=>({update:patch=>{writes.push(patch);return query},delete:()=>{writes.push('delete');return query}})}
  const helpers={...backend,planSession:async request=>{if(request)harvestServer.requireSameOrigin(request);return {supabase,user:{id:owner}}},readPlan:async()=>current}
  const route=load('src/app/api/farm-plans/[id]/route.ts',{'@/lib/farm-plans/shared':s,'@/lib/farm-plans/server':helpers})
  return {route,writes,filters,id,owner,ctx:{params:Promise.resolve({id})},req:(data=plan('selling'),origin)=>new Request('http://localhost/api/farm-plans/'+id,{method:'PATCH',headers:origin?{origin}:{},body:JSON.stringify({data,version:stale?2:3})})}
}
test('stale and racing saves return 409 rather than overwriting another edit', async () => {
  let f=detailFixture({stale:true});assert.equal((await f.route.PATCH(f.req(),f.ctx)).status,409);assert.equal(f.writes.length,0)
  f=detailFixture({raced:true});assert.equal((await f.route.PATCH(f.req(),f.ctx)).status,409)
})
test('valid updates constrain ownership and version and do not persist derived claims', async () => {
  const f=detailFixture(),r=await f.route.PATCH(f.req({...plan('selling'),owner_id:randomUUID(),version:99,profit:1}),f.ctx)
  assert.equal(r.status,200);assert.equal(f.writes[0].owner_id,undefined);assert.equal(f.writes[0].profit,undefined)
  assert.deepEqual(f.filters,[['id',f.id],['owner_id',f.owner],['version',3]])
})
test('cross-origin writes and oversold mutations fail before persistence', async () => {
  let f=detailFixture();assert.equal((await f.route.PATCH(f.req(plan('selling'),'https://attacker.invalid'),f.ctx)).status,403);assert.equal(f.writes.length,0)
  f=detailFixture();assert.equal((await f.route.PATCH(f.req({...plan('selling'),sales:[sale(1001,5)]}),f.ctx)).status,400);assert.equal(f.writes.length,0)
})
test('creating a plan always assigns the verified session owner', async () => {
  let inserted;const owner=randomUUID()
  const helpers={...backend,planSession:async()=>({user:{id:owner},supabase:{from:()=>({insert:data=>{inserted=data;return {select:()=>({single:async()=>({data:{...data,id:randomUUID(),version:1},error:null})})}}})}})}
  const route=load('src/app/api/farm-plans/route.ts',{'@/lib/farm-plans/shared':s,'@/lib/farm-plans/server':helpers})
  const r=await route.POST(new Request('http://localhost/api/farm-plans',{method:'POST',body:JSON.stringify({...plan(),owner_id:randomUUID(),status:'active'})}))
  assert.equal(r.status,201);assert.equal(inserted.owner_id,owner)
})
