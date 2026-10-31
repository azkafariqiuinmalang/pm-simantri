/* eslint-disable @typescript-eslint/no-require-imports -- Local Node test harness. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { readConfig, verifyConfiguredTarget } = require('../scripts/verify-pm-database.cjs')
const project = require('../docs/database/pm_project.json')

test('PM environment targets the isolated project with a publishable key', { skip: !fs.existsSync('.env.local') }, () => {
  const config = readConfig(fs.readFileSync('.env.local', 'utf8'))
  assert.equal(verifyConfiguredTarget(config).project_id, project.project_id)
})
test('verifier rejects a competition or unrelated database URL', () => {
  assert.throws(() => verifyConfiguredTarget({ NEXT_PUBLIC_SUPABASE_URL: 'https://unrelated.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test' }))
})
test('verifier rejects server secrets and missing keys in public configuration', () => {
  for (const key of ['', undefined, 'sb_secret_do-not-expose', 'legacy-competition-key']) {
    assert.throws(() => verifyConfiguredTarget({ NEXT_PUBLIC_SUPABASE_URL: project.url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key }))
  }
})
test('environment parser handles quoted values without logging secrets', () => {
  assert.deepEqual(readConfig('# comment\nNEXT_PUBLIC_SUPABASE_URL="https://test.supabase.co"\nEMPTY=\n'), {
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', EMPTY: '',
  })
})
test('initial PM schema forbids CV/forecasting and includes restricted roles and grants', () => {
  const sql = fs.readFileSync('docs/database/simantri_pm_schema.sql', 'utf8')
  assert.doesNotMatch(sql, /create table[^;]*(cv_detections|price_predictions|content_suggestions|weather_data)/i)
  assert.equal((sql.match(/enable row level security/g) || []).length, 6)
  assert.match(sql, /grant update\(full_name,village,updated_at\) on public.profiles/)
  assert.doesNotMatch(sql, /grant update\(role\)/)
  assert.match(sql, /'petani', left\(new.raw_user_meta_data/)
  assert.match(sql, /price_type integer not null default 4 check \(price_type in \(1,2,3,4\)\)/)
})
