/* eslint-disable @typescript-eslint/no-require-imports -- Local Node test harness. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(relative, overrides = {}) {
  const filename = path.resolve(relative)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const instance = new Module(filename, module)
  instance.filename = filename
  instance.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = instance.require.bind(instance)
  instance.require = name => Object.hasOwn(overrides, name) ? overrides[name] : original(name)
  instance._compile(code, filename)
  return instance.exports
}
const pihps = load('src/lib/market/pihps.ts')
const responseMock = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }
const read = file => fs.readFileSync(file, 'utf8')
const row = (id = 16, name = 'Jawa Timur', price = 28000) => ({ ProvID: id, Provinsi: name, Nilai: price, Tanggal: '1 Okt 26', Komoditas: pihps.PIHPS_COMMODITY })

test('strict calendar validation and PIHPS date format', () => {
  assert.equal(pihps.isIsoDate('2026-10-20'), true)
  assert.equal(pihps.isIsoDate('2024-02-29'), true)
  for (const invalid of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-1-01', '', null]) assert.equal(pihps.isIsoDate(invalid), false)
  assert.equal(pihps.formatPihpsDate('2026-10-20'), 'Oct 20, 2026')
})

test('normalization keeps actual province data and rejects missing/nonpositive prices', () => {
  const result = pihps.normalizePihpsRows([
    row(), row(31, 'Bali', '29000'), row(0, 'Nasional', 30000),
    row(1, 'Tidak tersedia', null), row(2, 'Kosong', ''), row(3, 'Nol', 0),
    row(4, 'Negatif', -1), row(5, 'Tidak valid', '28.000,00'), row(6, '', 100),
  ], '2026-10-01')
  assert.deepEqual(result.map(item => item.harga), [28000, 29000])
  assert.deepEqual(result.map(item => item.provinsi), ['Jawa Timur', 'Bali'])
  assert.equal(result[0].price_type, 4)
  assert.deepEqual(pihps.normalizePihpsRows(null, '2026-10-20'), [])
  assert.deepEqual(pihps.normalizePihpsRows([], 'bad'), [])
})

test('duplicate provinces are normalized to one record', () => {
  assert.equal(pihps.normalizePihpsRows([row(), row(16, 'Jawa Timur', 30000)], '2026-10-01').length, 1)
})

function syncRoute({ role = 'admin', user = true, rpcError = null } = {}) {
  const writes = []
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: 'unit-user' } : null } }) },
    from: () => {
      const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role }, error: null }) }
      return chain
    },
    rpc: async (name, args) => { writes.push({ name, args }); return { error: rpcError } },
  }
  const route = load('src/app/api/market/sync-pihps/route.ts', {
    'next/server': responseMock,
    '@/lib/supabase/server': { createClient: async () => client },
    '@/lib/market/pihps': pihps,
  })
  return { route, writes }
}
const request = body => ({ headers: new Headers(), json: async () => body })

test('PIHPS sync persists source prices without running weather or forecasting', async () => {
  const original = global.fetch
  const calls = []
  global.fetch = async url => {
    calls.push(String(url))
    return { ok: true, json: async () => ({ data: [row(), row(31, 'Bali', 32000)] }) }
  }
  try {
    const { route, writes } = syncRoute()
    const response = await route.POST(request({ mode: 'today', tanggal: '2026-10-01' }))
    assert.equal(response.status, 200)
    assert.equal(writes.length, 2)
    assert.equal(writes[0].name, 'upsert_scraped_regional_price')
    assert.equal(writes[1].args.p_harga, 28000)
    assert.equal(calls.length, 1)
    assert.match(calls[0], /^https:\/\/www\.bi\.go\.id\/hargapangan\//)
    assert.equal(new URL(calls[0]).searchParams.get('priceType'), '4')
  } finally { global.fetch = original }
})

test('missing regional data creates no invented price', async () => {
  const original = global.fetch
  try {
    for (const data of [[], [row(16, 'Jawa Timur', null)]]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ data }) })
      const { route, writes } = syncRoute()
      const response = await route.POST(request({ tanggal: '2026-10-01' }))
      assert.equal(writes.length, 0)
      assert.ok(['no_data', 'invalid_data'].includes(response.body.data.results[0].status))
    }
  } finally { global.fetch = original }
})

test('another province cannot become a substitute East Java price', async () => {
  const original = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [row(31, 'Bali', 32000)] }) })
  try {
    const { route, writes } = syncRoute()
    const response = await route.POST(request({ tanggal: '2026-10-01' }))
    assert.equal(response.status, 200)
    assert.equal(writes.length, 1)
    assert.equal(writes[0].name, 'upsert_scraped_regional_price')
    assert.equal(response.body.data.results[0].jatim_price, null)
  } finally { global.fetch = original }
})

test('sync rejects unauthorized users and invalid inputs before network/write operations', async () => {
  const original = global.fetch
  global.fetch = async () => { throw new Error('Unexpected network') }
  try {
    for (const [options, expected] of [[{ user: false }, 401], [{ role: 'petani' }, 403], [{ role: 'penyuluh' }, 403]]) {
      const { route, writes } = syncRoute(options)
      assert.equal((await route.POST(request({}))).status, expected)
      assert.equal(writes.length, 0)
    }
    const { route, writes } = syncRoute()
    for (const body of [{ tanggal: '2026-02-30' }, { days: 31 }, { days: 'NaN' }, { mode: 'forecast' }]) {
      assert.equal((await route.POST(request(body))).status, 400)
    }
    assert.equal(writes.length, 0)
  } finally { global.fetch = original }
})

test('PIHPS upstream and RPC failures are not reported as success', async () => {
  const original = global.fetch
  try {
    global.fetch = async () => ({ ok: false })
    let setup = syncRoute()
    assert.equal((await setup.route.POST(request({ tanggal: '2026-10-01' }))).status, 502)
    assert.equal(setup.writes.length, 0)
    global.fetch = async () => ({ ok: true, json: async () => ({ data: [row()] }) })
    setup = syncRoute({ rpcError: { message: 'mock failure' } })
    assert.equal((await setup.route.POST(request({ tanggal: '2026-10-01' }))).status, 502)
    assert.equal(setup.writes.length, 1)
  } finally { global.fetch = original }
})

test('PM role guard rejects legacy roles and prevents Petani entering Admin', async () => {
  for (const [role, adminOnly, destination] of [['petani', true, '/dashboard'], ['penyuluh', false, '/login?reason=pm-role'], ['admin', true, null]]) {
    const { requirePmProfile } = load('src/lib/auth/pm-profile.ts', {
      'next/navigation': { redirect: url => { throw new Error('redirect:' + url) } },
      '@/lib/supabase/server': { createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'mock' } } }) },
        from: () => { const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role }, error: null }) }; return chain },
      }) },
    })
    if (destination) await assert.rejects(requirePmProfile(adminOnly), { message: 'redirect:' + destination })
    else assert.equal((await requirePmProfile(adminOnly)).role, 'admin')
  }
})

test('retired endpoints are absent, Dunia Brambang remains, and PM navigation has no retired links', () => {
  for (const file of ['src/app/api/detect-disease/route.ts', 'src/app/api/predict-price/route.ts', 'src/app/dashboard/deteksi/page.tsx', 'src/app/admin/verifikasi-penyuluh/page.tsx']) assert.equal(fs.existsSync(file), false)
  assert.equal(fs.existsSync('public/dunia-brambang.html'), true)
  const sidebar = read('src/components/dashboard/Sidebar.tsx')
  assert.match(sidebar, /\/dunia-brambang/)
  assert.match(sidebar, /Harvest Listing/)
  assert.doesNotMatch(sidebar, /dashboard\/(deteksi|usulan|sinyal-wilayah|tinjau-usulan)|verifikasi-penyuluh/)
  assert.doesNotMatch(read('src/app/api/market/sync-pihps/route.ts'), /weather_data|price_predictions|XGBoost|\|\| 15000/)
  assert.doesNotMatch(read('src/app/admin/market/input/page.tsx'), /scrapedPrice|demoPrices|29000/)
  assert.doesNotMatch(read('src/app/dashboard/page.tsx'), /samplePrices|cv_detections|price_predictions|content_suggestions/)
})
