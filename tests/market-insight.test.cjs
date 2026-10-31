/* eslint-disable @typescript-eslint/no-require-imports -- Local Node regression harness. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')

function load(relative, overrides = {}) {
  const filename = path.resolve(relative)
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
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
const responseMock = { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200, headers: options?.headers }) } }
const row = (extra = {}) => ({ ProvID: 16, Provinsi: 'Jawa Timur', Nilai: 15700, Tanggal: '16 Okt 26', Komoditas: pihps.PIHPS_COMMODITY, ...extra })
const req = body => ({ headers: new Headers(), json: async () => body })

test('PIHPS publication parser validates Indonesian and ISO calendar dates', () => {
  for (const [source, expected] of [['20 Okt 26', '2026-10-20'], ['1 Mei 2026', '2026-05-01'], ['29 Feb 24', '2024-02-29'], ['2026-10-01', '2026-10-01']]) assert.equal(pihps.parsePihpsPublishedDate(source), expected)
  for (const value of [null, {}, '', '31 Feb 26', '0 Okt 26', '12 Invalid 26', '2026-02-29']) assert.equal(pihps.parsePihpsPublishedDate(value), null)
  assert.deepEqual(pihps.calendarDates('2026-10-20', 30).slice(0, 2), ['2026-09-21', '2026-09-22'])
  assert.equal(pihps.calendarDates('2026-10-20', 30).at(-1), '2026-10-20')
  assert.deepEqual(pihps.calendarDates('2026-02-30', 30), [])
  assert.deepEqual(pihps.calendarDates('2026-10-20', 0), [])
})

test('weekend carry-forward and another commodity never become new observations', () => {
  assert.deepEqual(pihps.normalizePihpsRows([row()], '2026-10-18'), [])
  assert.deepEqual(pihps.normalizePihpsRows([row({ Komoditas: 'Bawang Putih Ukuran Sedang' })], '2026-10-16'), [])
  assert.deepEqual(pihps.normalizePihpsRows([row({ Tanggal: null })], '2026-10-16'), [])
  assert.equal(pihps.normalizePihpsRows([row()], '2026-10-16')[0].tanggal, '2026-10-16')
  assert.deepEqual(pihps.pihpsSourceDates([row(), row(), row({ Tanggal: '15 Okt 26' }), null]), ['2026-10-15', '2026-10-16'])
})

function syncSetup() {
  const writes = []
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'mock-admin' } } }) },
    from: () => { const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role: 'admin' } }) }; return chain },
    rpc: async (name, args) => { writes.push({ name, args }); return { error: null } },
  }
  return { writes, route: load('src/app/api/market/sync-pihps/route.ts', {
    'next/server': responseMock, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/market/pihps': pihps,
  }) }
}

test('weekend sync reports no publication without writing Friday prices under Sunday', async () => {
  const original = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ data: [row()] }) })
  try {
    const { route, writes } = syncSetup()
    const response = await route.POST(req({ tanggal: '2026-10-18' }))
    assert.equal(response.status, 200)
    assert.equal(response.body.data.results[0].status, 'no_publication')
    assert.deepEqual(response.body.data.results[0].source_dates, ['2026-10-16'])
    assert.equal(writes.length, 0)
  } finally { global.fetch = original }
})

test('valid dated observations are stored; malformed or wrong commodity payloads fail closed', async () => {
  const original = global.fetch
  try {
    for (const body of [null, [], 'text']) assert.equal((await syncSetup().route.POST(req(body))).status, 400)
    for (const data of [[row({ Komoditas: 'Bawang Putih' })], [row({ Tanggal: '' })]]) {
      global.fetch = async () => ({ ok: true, json: async () => ({ data }) })
      const { route, writes } = syncSetup()
      assert.equal((await route.POST(req({ tanggal: '2026-10-16' }))).status, 502)
      assert.equal(writes.length, 0)
    }
    global.fetch = async () => ({ ok: true, json: async () => ({ data: [row(), row({ ProvID: 17, Provinsi: 'Bali', Tanggal: '15 Okt 26' })] }) })
    const { route, writes } = syncSetup()
    const result = await route.POST(req({ tanggal: '2026-10-16' }))
    assert.equal(result.body.data.results[0].regional_count, 1)
    assert.equal(result.body.data.results[0].skipped_count, 1)
    assert.equal(writes[0].args.p_records[0].tanggal, '2026-10-16')
    assert.equal(writes[1].args.p_input_by, 'mock-admin')
  } finally { global.fetch = original }
})

test('a cron secret alone cannot bypass the Admin session or RLS', async () => {
  const oldSecret = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'unit-test-only-not-a-credential'
  try {
    const { route, writes } = syncSetup()
    const request = req({})
    request.headers.set('authorization', 'Bearer ' + process.env.CRON_SECRET)
    const result = await route.POST(request)
    assert.equal(result.status, 503)
    assert.equal(result.body.error.code, 'CRON_NOT_READY')
    assert.equal(writes.length, 0)
  } finally { if (oldSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = oldSecret }
})

function readSetup(relative, responses, user = true) {
  const calls = []
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: 'mock-reader' } : null } }) },
    from: table => {
      const response = responses.shift() || { data: [], error: null }
      const chain = { then: (resolve, reject) => Promise.resolve(response).then(resolve, reject) }
      for (const name of ['select', 'eq', 'gt', 'gte', 'lte', 'order', 'limit']) chain[name] = (...args) => { calls.push({ table, name, args }); return chain }
      chain.maybeSingle = async () => response
      return chain
    },
  }
  return { calls, route: load(relative, { 'next/server': responseMock, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/market/pihps': pihps }) }
}
const urlRequest = url => ({ url: 'http://localhost' + url, nextUrl: new URL('http://localhost' + url) })

test('regional API chooses the latest stored date and exposes source metadata without a national fallback', async () => {
  const fixture = [{ tanggal: '2026-10-16', prov_id: 16, provinsi: 'Jawa Timur', harga: 15700 }]
  const { route, calls } = readSetup('src/app/api/market/regional/route.ts', [{ data: { tanggal: '2026-10-16' } }, { data: fixture }])
  const result = await route.GET(urlRequest('/api/market/regional'))
  assert.equal(result.status, 200)
  assert.equal(result.body.meta.date, '2026-10-16')
  assert.equal(result.body.meta.price_type, 'Produsen')
  assert.equal(result.headers['Cache-Control'], 'private, no-store')
  assert.deepEqual(result.body.data, fixture)
  assert.ok(calls.some(call => call.name === 'eq' && call.args[0] === 'tanggal' && call.args[1] === '2026-10-16'))
})

test('regional and legacy history use a calendar window, not the last N observations', async () => {
  for (const [file, url] of [
    ['src/app/api/market/regional/history/route.ts', '/api/market/regional/history?province=16&days=30&end=2026-10-20'],
    ['src/app/api/market/price/history/route.ts', '/api/market/price/history?days=30&end=2026-10-20'],
  ]) {
    const { route, calls } = readSetup(file, [{ data: [] }])
    const result = await route.GET(urlRequest(url))
    assert.equal(result.status, 200)
    assert.equal(result.body.meta.start, '2026-09-21')
    assert.equal(result.body.meta.end, '2026-10-20')
    assert.ok(calls.some(call => call.name === 'gte' && call.args[1] === '2026-09-21'))
    assert.ok(calls.some(call => call.name === 'lte' && call.args[1] === '2026-10-20'))
  }
})

test('read APIs reject missing sessions, bad calendar input, and future dates', async () => {
  for (const [file, url] of [
    ['src/app/api/market/regional/route.ts', '/api/market/regional'],
    ['src/app/api/market/regional/history/route.ts', '/api/market/regional/history?province=16'],
    ['src/app/api/market/price/history/route.ts', '/api/market/price/history'],
  ]) {
    const { route, calls } = readSetup(file, [], false)
    assert.equal((await route.GET(urlRequest(url))).status, 401)
    assert.equal(calls.length, 0)
  }
  const regional = readSetup('src/app/api/market/regional/route.ts', []).route
  for (const date of ['2026-02-30', '2099-01-01']) assert.equal((await regional.GET(urlRequest('/api/market/regional?date=' + date))).status, 400)
  const history = readSetup('src/app/api/market/regional/history/route.ts', []).route
  for (const params of ['province=0', 'province=16&days=366', 'province=16&end=2099-01-01']) assert.equal((await history.GET(urlRequest('/api/market/regional/history?' + params))).status, 400)
})

test('calendar chart spaces a weekend gap proportionally and still supports arbitrary labels', () => {
  const { renderToStaticMarkup } = require('react-dom/server')
  const { PriceLineChart } = load('src/components/dashboard/DashboardUI.tsx', {
    react: { ...require('react'), useId: () => 'chart-unit', useState: () => [null, () => {}], useMemo: callback => callback() },
    '@/components/ui/LanguageProvider': { useLanguage: () => ({ t: source => source }) },
  })
  const points = [{ label: '2026-10-16', value: 100 }, { label: '2026-10-19', value: 200 }, { label: '2026-10-20', value: 150 }]
  const html = renderToStaticMarkup(PriceLineChart({ points, calendarScale: true }))
  // Chart plot spans x=54..740. Monday is 3/4 of the way from Friday to Tuesday.
  assert.match(html, /cx="568\.5"/)
  assert.match(html, /cx="740"/)
  assert.match(renderToStaticMarkup(PriceLineChart({ points: points.map((p, i) => ({ ...p, label: 'P' + i })), calendarScale: true })), /cx="397"/)
})

test('comparison dates are explicitly applied from form data instead of showing an uncommitted date', () => {
  const changes = []
  let stateIndex = 0
  const { default: MarketPage } = load('src/app/dashboard/harga/page.tsx', {
    react: { ...require('react'),
      useState: initial => { const index = stateIndex++; return [typeof initial === 'function' ? initial() : initial, value => changes.push({ index, value })] },
      useCallback: callback => callback, useMemo: callback => callback, useEffect: () => {}, useRef: value => ({ current: value }),
    },
    '@/components/ui/LanguageProvider': { useLanguage: () => ({ t: source => source }) },
    '@/components/dashboard/DashboardUI': {}, '@/lib/market/pihps': pihps,
  })
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null
    if (predicate(node)) return node
    for (const child of [].concat(node.props?.children || [])) { const match = find(child, predicate); if (match) return match }
    return null
  }
  const shell = MarketPage()
  stateIndex = 0
  const page = shell.type(shell.props)
  const input = find(page, node => node.type === 'input' && node.props.name === 'date')
  const form = find(page, node => node.type === 'form')
  input.props.onChange({ target: { value: '2026-10-18' } })
  assert.deepEqual(changes, [{ index: 1, value: '2026-10-18' }])
  const oldFormData = global.FormData
  const actualForm = { selected: '2026-10-18' }
  global.FormData = class { constructor(element) { assert.equal(element, actualForm) } get(name) { assert.equal(name, 'date'); return actualForm.selected } }
  try {
    let prevented = false
    form.props.onSubmit({ currentTarget: actualForm, preventDefault: () => { prevented = true } })
    assert.equal(prevented, true)
    assert.deepEqual(changes.at(-1), { index: 0, value: '2026-10-18' })
  } finally { global.FormData = oldFormData }
})

test('four price types have strict identifiers and separate official source links', () => {
  assert.deepEqual(pihps.PIHPS_PRICE_TYPES.map(type => type.id), [4, 3, 1, 2])
  assert.equal(new Set(pihps.PIHPS_PRICE_TYPES.map(type => type.source_url)).size, 4)
  assert.equal(pihps.parsePihpsPriceType(undefined), 4)
  for (const type of pihps.PIHPS_PRICE_TYPES) {
    assert.equal(pihps.parsePihpsPriceType(String(type.id)), type.id)
    assert.equal(pihps.pihpsPriceTypeInfo(type.id).label, type.label)
    assert.equal(pihps.normalizePihpsRows([row()], '2026-10-16', type.id)[0].price_type, type.id)
  }
  for (const invalid of [0, 5, '', 'all', '04', true, {}, [], '1e0']) assert.equal(pihps.parsePihpsPriceType(invalid), null)
})

test('sync fetches and stores the requested category; non-producer prices never overwrite legacy producer history', async () => {
  const original = global.fetch
  const urls = []
  global.fetch = async url => { urls.push(new URL(url)); return { ok: true, json: async () => ({ data: [row()] }) } }
  try {
    for (const type of pihps.PIHPS_PRICE_TYPES) {
      const { route, writes } = syncSetup()
      const result = await route.POST(req({ tanggal: '2026-10-16', price_type: type.id }))
      assert.equal(result.status, 200)
      assert.equal(urls.at(-1).searchParams.get('priceType'), String(type.id))
      assert.equal(writes[0].args.p_records[0].price_type, type.id)
      assert.equal(writes.length, type.id === 4 ? 2 : 1)
      assert.equal(result.body.data.price_type_id, type.id)
      assert.equal(result.body.data.source_url, type.source_url)
    }
    for (const invalid of [0, 5, 'all', true, {}]) {
      const { route, writes } = syncSetup()
      assert.equal((await route.POST(req({ price_type: invalid }))).status, 400)
      assert.equal(writes.length, 0)
    }
    assert.equal(urls.length, 4)
  } finally { global.fetch = original }
})

test('latest date and province history are isolated by the selected price type', async () => {
  for (const type of pihps.PIHPS_PRICE_TYPES) {
    const regional = readSetup('src/app/api/market/regional/route.ts', [{ data: { tanggal: '2026-10-16' } }, { data: [] }])
    const result = await regional.route.GET(urlRequest('/api/market/regional?price_type=' + type.id))
    assert.equal(result.body.meta.price_type_id, type.id)
    assert.equal(result.body.meta.price_type, type.label)
    assert.equal(result.body.meta.source_url, type.source_url)
    assert.equal(regional.calls.filter(call => call.name === 'eq' && call.args[0] === 'price_type' && call.args[1] === type.id).length, 2)
    const history = readSetup('src/app/api/market/regional/history/route.ts', [{ data: [] }])
    const response = await history.route.GET(urlRequest('/api/market/regional/history?province=16&price_type=' + type.id))
    assert.equal(response.body.meta.price_type_id, type.id)
    assert.ok(history.calls.some(call => call.name === 'eq' && call.args[0] === 'price_type' && call.args[1] === type.id))
    assert.deepEqual(response.body.data, [])
  }
})

test('invalid categories fail closed and missing categories have no producer fallback data', async () => {
  for (const [file, url] of [
    ['src/app/api/market/regional/route.ts', '/api/market/regional?'],
    ['src/app/api/market/regional/history/route.ts', '/api/market/regional/history?province=16&'],
  ]) {
    for (const value of ['0', '5', '', 'all', '4.0']) {
      const { route, calls } = readSetup(file, [])
      assert.equal((await route.GET(urlRequest(url + 'price_type=' + value))).status, 400)
      assert.equal(calls.length, 0)
    }
  }
  const { route, calls } = readSetup('src/app/api/market/regional/route.ts', [{ data: null }])
  const result = await route.GET(urlRequest('/api/market/regional?price_type=2'))
  assert.equal(result.body.meta.date, null)
  assert.equal(result.body.meta.price_type, 'Pasar Modern')
  assert.deepEqual(result.body.data, [])
  assert.equal(calls.filter(call => call.name === 'eq' && call.args[0] === 'price_type').length, 1)
})

test('switching categories remounts price state, preventing old series under a new label', () => {
  const changes = []
  const { default: MarketPage } = load('src/app/dashboard/harga/page.tsx', {
    react: { ...require('react'), useState: initial => [initial, value => changes.push(value)] },
    '@/components/ui/LanguageProvider': {}, '@/components/dashboard/DashboardUI': {}, '@/lib/market/pihps': pihps,
  })
  const shell = MarketPage()
  assert.equal(shell.key, '4')
  assert.equal(shell.props.priceType, 4)
  shell.props.onPriceTypeChange(2)
  assert.deepEqual(changes, [2])
})

test('60-day retention includes today and 59 preceding calendar days, not two months or 60 observations', () => {
  assert.equal(pihps.MARKET_RETENTION_DAYS, 60)
  assert.equal(pihps.marketRetentionStart('2026-11-22'), '2026-09-24')
  assert.equal(pihps.marketRetentionStart('2024-03-01'), '2024-01-02')
  assert.equal(pihps.calendarDates('2026-11-22', 60).length, 60)
})

test('latest observations keep their actual source date and reject future/expired or invalid prices', () => {
  const latest = pihps.latestPihpsObservation([row(), row({ Tanggal: '19 Okt 26', Nilai: 0 }), row({ Tanggal: '21 Okt 26' }), row({ Tanggal: '1 Agu 26' })], '2026-10-20', 2)
  assert.equal(latest.date, '2026-10-16')
  assert.equal(latest.records[0].tanggal, '2026-10-16')
  assert.equal(latest.records[0].price_type, 2)
  assert.equal(pihps.latestPihpsObservation([row({ Tanggal: '1 Agu 26' })], '2026-10-20', 4), null)
})

test('latest sync uses a server-owned date and stores the source date, never relabeling stale prices as today', async () => {
  const original = global.fetch
  const urls = []
  global.fetch = async url => { urls.push(new URL(url)); return { ok: true, json: async () => ({ data: [row()] }) } }
  try {
    const { route, writes } = syncSetup()
    const result = await route.POST(req({ mode: 'latest', tanggal: '2099-01-01', price_type: 4 }))
    assert.equal(result.status, 200)
    assert.equal(urls[0].searchParams.get('tanggal'), pihps.formatPihpsDate(pihps.jakartaToday()))
    assert.equal(result.body.data.results[0].date, '2026-10-16')
    assert.equal(writes[0].args.p_records[0].tanggal, '2026-10-16')
    assert.equal(writes[1].args.p_tanggal, '2026-10-16')
  } finally { global.fetch = original }
})

test('sync outside the retention window is rejected before any upstream request or write', async () => {
  const { route, writes } = syncSetup()
  assert.equal((await route.POST(req({ tanggal: '2020-01-01' }))).status, 400)
  assert.equal(writes.length, 0)
})

test('retention API checks Admin and invokes only a no-argument RPC, ignoring browser-supplied cutoffs', async () => {
  for (const [user, role, rpcError, expected] of [[false, 'admin', false, 401], [true, 'petani', false, 403], [true, 'admin', true, 500], [true, 'admin', false, 200]]) {
    const calls = []
    const client = {
      auth: { getUser: async () => ({ data: { user: user ? { id: 'mock' } : null } }) },
      from: () => { const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: { role } }) }; return chain },
      rpc: async (...args) => { calls.push(args); return { data: rpcError ? null : { retention_days: 60, cutoff_date: '2026-08-22', deleted_regional: 0, deleted_legacy: 0 }, error: rpcError ? {} : null } },
    }
    const route = load('src/app/api/market/retention/route.ts', { 'next/server': responseMock, '@/lib/supabase/server': { createClient: async () => client } })
    const result = await route.POST(req({ cutoff: '2099-01-01' }))
    assert.equal(result.status, expected)
    assert.deepEqual(calls, user && role === 'admin' ? [['prune_expired_market_prices']] : [])
  }
})

test('the main Admin action syncs all four latest types and cleans up only after a successful, uncancelled run', async () => {
  const original = global.fetch
  try {
    for (const scenario of ['success', 'upstream-error', 'cancelled', 'retention-error']) {
      const calls = [], stateChanges = [], stopRef = { current: false }
      const { default: AdminPage } = load('src/app/admin/market/input/page.tsx', {
        react: { ...require('react'), useState: initial => [typeof initial === 'function' ? initial() : initial, value => stateChanges.push(value)], useEffect: () => {}, useCallback: fn => fn, useRef: () => stopRef },
        'next/link': {}, '@/lib/market/pihps': pihps, '@/components/dashboard/DashboardUI': {}, '@/components/ui/LanguageProvider': { useLanguage: () => ({ t: value => value }) },
      })
      global.fetch = async (url, options) => {
        calls.push({ url, body: options?.body ? JSON.parse(options.body) : null })
        if (url === '/api/market/sync-pihps') {
          if (scenario === 'cancelled') stopRef.current = true
          return { ok: scenario !== 'upstream-error', status: scenario === 'upstream-error' ? 502 : 200, json: async () => ({ data: { results: [{ date: '2026-10-20', status: scenario === 'upstream-error' ? 'error' : 'synced' }] } }) }
        }
        if (url === '/api/market/retention') return { ok: scenario !== 'retention-error', json: async () => ({ data: { cutoff_date: '2026-08-22', through_date: '2026-10-20', deleted_regional: 0, deleted_legacy: 0 } }) }
        return { ok: true, json: async () => ({ data: [] }) }
      }
      function find(node) {
        if (!node || typeof node !== 'object') return null
        if (node.type === 'button' && [].concat(node.props.children).includes('Sinkronisasi harga terbaru')) return node
        for (const child of [].concat(node.props?.children || [])) { const found = find(child); if (found) return found }
        return null
      }
      find(AdminPage()).props.onClick()
      await new Promise(resolve => setImmediate(resolve))
      const syncCalls = calls.filter(call => call.url === '/api/market/sync-pihps')
      assert.equal(syncCalls.length, scenario === 'cancelled' ? 1 : 4)
      assert.ok(syncCalls.every(call => call.body.mode === 'latest'))
      if (scenario !== 'cancelled') assert.deepEqual(syncCalls.map(call => call.body.price_type), [4,3,1,2])
      assert.equal(calls.filter(call => call.url === '/api/market/retention').length, ['success', 'retention-error'].includes(scenario) ? 1 : 0)
      if (scenario === 'retention-error') assert.ok(stateChanges.some(value => typeof value === 'string' && value.includes('pembersihan riwayat belum berhasil')))
    }
  } finally { global.fetch = original }
})
