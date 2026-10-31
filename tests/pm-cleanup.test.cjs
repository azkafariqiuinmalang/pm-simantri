/* eslint-disable @typescript-eslint/no-require-imports -- Local source/regression checks. */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

test('competition-only source, experiments, legacy schema and media are absent from PM', () => {
  for (const target of ['ml', 'remotion-video', 'scratch', 'docs/api', 'docs/architecture', 'docs/design', 'docs/product', 'docs/database/archive',
    'docs/database/simantri_schema_v4.sql', 'PROGRESS_REPORT.md', 'QUERY_GUIDELINES.md',
    'src/components/landing/PlatformVideoDemo.tsx', 'src/components/ui/TiltCard.tsx', 'src/app/dunia-brambang/experience.tsx',
    'public/UIUX BARU', 'public/media', 'public/video_landing_page.mp4']) assert.equal(fs.existsSync(target), false, target)
})

test('core PM modules, real data, education assets and development history remain', () => {
  for (const target of ['.git', 'node_modules/next', 'src/app/api/chat/route.ts', 'src/app/api/diseases/route.ts',
    'src/app/api/market/sync-pihps/route.ts', 'src/app/dashboard/panen/page.tsx', 'src/app/admin/penyakit/page.tsx',
    'public/dunia-brambang.html', 'public/dunia-brambang-audio.js', 'data/pm-diseases.json', 'data/market_prices_producer.csv',
    'docs/database/simantri_pm_schema.sql', 'PRD.md', '.env.local']) assert.ok(fs.existsSync(target), target)
  function countMarkdown(dir) { return fs.readdirSync(dir, { withFileTypes: true }).reduce((n, item) => n + (item.isDirectory() ? countMarkdown(path.join(dir, item.name)) : Number(item.name.endsWith('.md'))), 0) }
  assert.ok(countMarkdown('knowledge_base') >= 39)
})

test('all literal local media referenced by active TSX resolve to retained files', () => {
  const files = []
  function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const full = path.join(dir, item.name); if (item.isDirectory()) walk(full); else if (full.endsWith('.tsx')) files.push(full) } }
  walk('src')
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    for (const match of text.matchAll(/['"](\/[^'"\r\n]*\.(?:png|jpe?g|svg|webp|ico|mp4|wav|mp3))['"]/gi)) {
      assert.ok(fs.existsSync(path.join('public', match[1])), `${file}: missing ${match[1]}`)
    }
    assert.doesNotMatch(text, /PlatformVideoDemo|from ['"](?:tone|gsap)|\/UIUX BARU\/|\/logo_sima\.png/)
  }
})

test('local guide and config use PM scope without stale competition services', () => {
  const prd = fs.readFileSync('PRD.md', 'utf8')
  assert.match(prd, /^# Product Requirements Document — SIMANTRI PM/)
  assert.doesNotMatch(prd, /^# Arsip PRD/)
  assert.match(prd, /Harvest Listing[\s\S]*belum/i)
  const guide = fs.readFileSync('PANDUAN_MENJALANKAN_LOCAL.md', 'utf8')
  assert.match(guide, /fdprawhpeoefpcnlbiya/)
  assert.doesNotMatch(guide, /giobbmjbykwqxzigmqzf|CV_MODEL_API_URL|PRICE_MODEL_API_URL|eyJhbGci/)
  for (const file of ['tsconfig.json', 'eslint.config.mjs']) assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /remotion-video/)
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  for (const name of ['gsap', 'tone', 'remotion', 'xgboost']) assert.equal(packageJson.dependencies[name], undefined)
})
