/* eslint-disable @typescript-eslint/no-require-imports -- Local verification script. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const expected = require('../docs/database/pm_project.json')

function readConfig(text) {
  const values = {}
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2')
  }
  return values
}
function verifyConfiguredTarget(values) {
  assert.equal(values.NEXT_PUBLIC_SUPABASE_URL, expected.url, 'PM must point to its own registered Supabase project.')
  assert.ok(values.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'), 'Use the PM publishable key, never a server secret or the old competition key.')
  return { project: expected.name, project_id: expected.project_id, url: expected.url, publishable_key_configured: true }
}
async function main() {
  const values = readConfig(fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8'))
  const report = verifyConfiguredTarget(values)
  if (process.argv.includes('--live')) {
    const { createClient } = require('@supabase/supabase-js')
    const client = createClient(expected.url, values.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { count, error } = await client.from('knowledge_entries').select('id', { count: 'exact', head: true }).eq('status', 'published')
    if (error) throw new Error('Knowledge read failed: ' + error.message)
    const diseases = await client.from('knowledge_entries').select('id', { count: 'exact', head: true })
      .eq('status', 'published').in('category', ['Penyakit Tanaman', 'Penyakit Bawang Merah', 'penyakit'])
    if (diseases.error) throw new Error('Disease catalog read failed: ' + diseases.error.message)
    const retrieval = await client.from('knowledge_entries').select('doc_id')
      .eq('status', 'published').textSearch('content', 'moler', { type: 'websearch', config: 'simple' }).limit(3)
    if (retrieval.error) throw new Error('RAG retrieval failed: ' + retrieval.error.message)
    assert.ok(retrieval.data.length > 0, 'RAG search did not find reference material.')
    const privateRead = await client.from('profiles').select('id').limit(0)
    assert.ok(privateRead.error, 'Anonymous profile access must be denied.')
    const health = await fetch(expected.url + '/auth/v1/health', {
      headers: { apikey: values.NEXT_PUBLIC_SUPABASE_ANON_KEY }, signal: AbortSignal.timeout(15000),
    })
    assert.ok(health.ok, 'Supabase Auth health check failed.')
    Object.assign(report, { published_knowledge: count, disease_entries: diseases.count, rag_retrieval_matches: retrieval.data.length, anonymous_profiles_denied: true, auth_health: health.status })
  }
  console.log(JSON.stringify(report, null, 2))
}
module.exports = { readConfig, verifyConfiguredTarget }
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
