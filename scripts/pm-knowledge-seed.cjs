/* eslint-disable @typescript-eslint/no-require-imports -- Offline import preparation. */
// Produces SQL for MCP execution on the NEW PM project only. No credentials/network.
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const matter = require('gray-matter')
const partSize = 30000
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : file.endsWith('.md') ? [file] : []
  }).sort()
}
const sources = files(path.join(__dirname, '..', 'knowledge_base'))
const string = value => value == null ? null : typeof value === 'string' ? value : JSON.stringify(value)
const array = value => Array.isArray(value) ? value.map(string).filter(Boolean) : value == null ? [] : [string(value)]
const fields = ['doc_id','title','category','subcategory','topic','summary','content','keywords',
  'semantic_keywords','synonyms','entity_type','location','recommended_month','recommended_season',
  'related_varieties','related_diseases','related_pests','related_weather','evidence_level','review_status',
  'source_title','image_urls','metadata','status']
function prepare(index) {
  if (!Number.isInteger(index) || index < 0 || index >= sources.length) throw new Error('Invalid document index')
  const parsed = matter(fs.readFileSync(sources[index], 'utf8'))
  const data = parsed.data
  if (!data.doc_id || !data.title || !data.category || !parsed.content.trim()) throw new Error('Incomplete document metadata')
  const record = {}
  for (const key of fields) record[key] = string(data[key])
  for (const key of ['keywords','semantic_keywords','synonyms','recommended_month','related_varieties','related_diseases','related_pests','related_weather']) record[key] = array(data[key])
  record.summary = string(data.summary) || ''
  record.content = parsed.content
  record.source_title = string(data.data_source) || 'Knowledge base lokal SIMANTRI'
  record.image_urls = /BERCAK-UNGU/.test(data.doc_id) ? ['/penyakit_bercak_ungu.jpg'] : []
  record.metadata = { ...data, local_source: path.relative(path.join(__dirname, '..'), sources[index]).replaceAll('\\', '/'), imported_for: 'SIMANTRI PM' }
  record.status = 'published'
  const json = JSON.stringify(record).replaceAll("'", "''")
  const updates = fields.filter(key => key !== 'doc_id').map(key => key + '=excluded.' + key).join(',')
  const sql = 'insert into public.knowledge_entries(' + fields.join(',') + ') select ' + fields.map(key => 'r.' + key).join(',') +
    " from jsonb_populate_record(null::public.knowledge_entries,'" + json + "'::jsonb) r on conflict(doc_id) do update set " + updates + ';'
  return { sql, doc_id: data.doc_id, content_md5: crypto.createHash('md5').update(parsed.content).digest('hex') }
}
if (process.argv[2] === '--manifest') {
  const manifest = sources.map((_, index) => {
    const item = prepare(index)
    return { index, doc_id: item.doc_id, content_md5: item.content_md5, parts: Math.ceil(item.sql.length / partSize) }
  })
  process.stdout.write(JSON.stringify(manifest))
} else if (process.argv[2] === '--part') {
  const item = prepare(Number(process.argv[3]))
  const part = Number(process.argv[4])
  if (!Number.isInteger(part) || part < 0 || part * partSize >= item.sql.length) throw new Error('Invalid SQL part')
  process.stdout.write(JSON.stringify(item.sql.slice(part * partSize, (part + 1) * partSize)))
} else {
  throw new Error('Use --manifest or --part <document-index> <part-index>')
}
