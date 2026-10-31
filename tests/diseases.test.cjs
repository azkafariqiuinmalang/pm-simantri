/* eslint-disable @typescript-eslint/no-require-imports -- Local Node test harness. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
function load(relative, overrides = {}) {
  const filename = path.resolve(relative)
  const instance = new Module(filename, module)
  instance.filename = filename
  instance.paths = Module._nodeModulePaths(path.dirname(filename))
  const original = instance.require.bind(instance)
  instance.require = name => Object.hasOwn(overrides, name) ? overrides[name] : original(name)
  instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
  return instance.exports
}
const lib = load('src/lib/diseases/catalogue.ts')
const seeds = require('../data/pm-diseases.json')
const entries = seeds.map(({ disease, ...row }, i) => ({ ...row, id: `00000000-0000-4000-8000-00000000000${i}`, updated_at: '2026-10-20T12:00:00.000Z', status: 'published', metadata: { catalogue: lib.DISEASE_CATALOGUE, disease }, content: lib.diseaseContent(row.title, row.summary, disease) }))
const current = entries[0]
const valid = { id: current.id, updated_at: current.updated_at, title: current.title, summary: current.summary, symptoms: current.metadata.disease.symptoms, prevention: current.metadata.disease.prevention, first_steps: current.metadata.disease.first_steps, status: 'published' }

test('four official-source entries validate without claiming photo ownership or expert review', () => {
  assert.equal(entries.length, 4)
  for (const row of entries) {
    assert.ok(lib.isDiseaseEntry(row))
    assert.match(row.content, /belum divalidasi ahli/)
    assert.match(row.metadata.disease.photo_reference.credit, /belum dikonfirmasi/)
  }
  assert.equal(lib.isDiseaseEntry({ ...current, metadata: { catalogue: 'legacy' } }), false)
  assert.equal(lib.isDiseaseEntry({ ...current, metadata: { ...current.metadata, disease: { ...current.metadata.disease, sources: [{ url: 'javascript:alert(1)' }] } } }), false)
})
test('search matches names, aliases and symptoms; part filters combine and reset', () => {
  assert.equal(lib.filterDiseases(entries, 'NGOLER')[0].doc_id, 'PM-DISEASE-MOLER-001')
  assert.equal(lib.filterDiseases(entries, 'pangkal', 'Akar & umbi').length, 1)
  assert.equal(lib.filterDiseases(entries, 'otomatis', 'Akar & umbi').length, 0)
  assert.equal(lib.filterDiseases(entries, 'tidak-ada').length, 0)
  assert.equal(lib.filterDiseases(entries, '').length, 4)
})
test('source URLs reject unsafe schemes, impostor hosts and credentials', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,x', 'http://repository.pertanian.go.id/a', 'https://repository.pertanian.go.id.evil.test', 'https://user@repository.pertanian.go.id/a', '/local.jpg']) assert.equal(lib.officialSourceUrl(url), null)
  assert.ok(lib.officialSourceUrl(seeds[0].disease.photo_reference.url))
})
test('edit validation rejects empty, oversized, stale-shaped or invalid inputs and strips unrelated fields', () => {
  assert.ok(lib.validateDiseaseEdit(valid))
  for (const change of [{ title: '' }, { symptoms: [] }, { first_steps: ['x'.repeat(601)] }, { prevention: Array(13).fill('a') }, { updated_at: 'bad' }, { status: 'expert-verified' }, { id: 'other' }]) assert.equal(lib.validateDiseaseEdit({ ...valid, ...change }), null)
  assert.equal(lib.validateDiseaseEdit({ ...valid, role: 'admin', metadata: { forged: true } }).metadata, undefined)
})
function setup({ role = 'admin', user = true, row = current, readError = null, saveError = null, saved = true } = {}) {
  const writes = []
  const filters = []
  const client = { auth: { getUser: async () => ({ data: { user: user ? { id: 'admin-test' } : null } }) }, from: table => {
    let updating = false
    const chain = { select: () => chain, eq: (...args) => { filters.push(args); return chain }, contains: (...args) => { filters.push(args); return chain }, single: async () => ({ data: { role } }), maybeSingle: async () => updating ? ({ data: saved ? { ...row, ...writes.at(-1) } : null, error: saveError }) : ({ data: row, error: readError }), update: payload => { updating = true; writes.push(payload); return chain } }
    assert.ok(['profiles', 'knowledge_entries'].includes(table))
    return chain
  } }
  const route = load('src/app/api/diseases/route.ts', { 'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/diseases/catalogue': lib })
  return { route, writes, filters }
}
const request = (body = valid, origin) => ({ url: 'http://127.0.0.1:3000/api/diseases', headers: new Headers(origin ? { origin } : {}), text: async () => JSON.stringify(body) })
test('anonymous, Petani and cross-origin edits are blocked before writes', async () => {
  for (const [options, expected] of [[{ user: false }, 401], [{ role: 'petani' }, 403]]) {
    const s = setup(options); assert.equal((await s.route.PATCH(request())).status, expected); assert.equal(s.writes.length, 0)
  }
  const s = setup(); assert.equal((await s.route.PATCH(request(valid, 'https://evil.test'))).status, 403); assert.equal(s.writes.length, 0)
})
test('Admin edit preserves source, photo credits and catalogue marker and regenerates RAG text', async () => {
  const s = setup()
  assert.equal((await s.route.PATCH(request({ ...valid, title: 'Judul baru', status: 'draft', metadata: { forged: true } }))).status, 200)
  assert.equal(s.writes.length, 1)
  assert.equal(s.writes[0].status, 'draft')
  assert.match(s.writes[0].content, /^# Judul baru/)
  assert.deepEqual(s.writes[0].metadata.disease.sources, current.metadata.disease.sources)
  assert.deepEqual(s.writes[0].metadata.disease.photo_reference, current.metadata.disease.photo_reference)
  assert.equal(s.writes[0].metadata.catalogue, lib.DISEASE_CATALOGUE)
  assert.ok(s.filters.some(([key, value]) => key === 'updated_at' && value === valid.updated_at))
})
test('same request Host works when Next reconstructs an internal hostname; foreign origin still fails', async () => {
  const requestWithProxy = request(valid, 'http://127.0.0.1:3000')
  requestWithProxy.url = 'http://localhost:3000/api/diseases'
  requestWithProxy.headers.set('host', '127.0.0.1:3000')
  assert.equal((await setup().route.PATCH(requestWithProxy)).status, 200)
  requestWithProxy.headers.set('origin', 'https://evil.test')
  assert.equal((await setup().route.PATCH(requestWithProxy)).status, 403)
})
test('invalid data, missing record, stale versions, DB errors and concurrent edits are not success', async () => {
  const bad = setup(); assert.equal((await bad.route.PATCH(request({}))).status, 400); assert.equal(bad.writes.length, 0)
  for (const [options, expected] of [[{ row: null }, 404], [{ readError: {} }, 500], [{ row: { ...current, updated_at: '2026-10-21T00:00:00Z' } }, 409], [{ saved: false }, 409], [{ saveError: {} }, 500]]) {
    const s = setup(options); assert.equal((await s.route.PATCH(request())).status, expected)
  }
})
test('catalogue reads only curated published entries and Admin uses guarded API', () => {
  const reader = fs.readFileSync('src/components/diseases/DiseaseCatalogue.tsx', 'utf8')
  assert.match(reader, /eq\('status', 'published'\)/)
  assert.match(reader, /contains\('metadata', \{ catalogue: DISEASE_CATALOGUE \}\)/)
  assert.doesNotMatch(reader, /penyakit_bercak_ungu\.jpg/)
  assert.match(fs.readFileSync('src/app/admin/penyakit/page.tsx', 'utf8'), /fetch\('\/api\/diseases'/)
})
