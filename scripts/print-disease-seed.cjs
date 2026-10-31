/* eslint-disable @typescript-eslint/no-require-imports -- Offline seed generation; never connects to a database. */
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const filename = path.join(root, 'src/lib/diseases/catalogue.ts')
const instance = new Module(filename, module)
instance.filename = filename
instance.paths = Module._nodeModulePaths(path.dirname(filename))
instance._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { diseaseContent, DISEASE_CATALOGUE } = instance.exports
const rows = JSON.parse(fs.readFileSync(path.join(root, 'data/pm-diseases.json'), 'utf8')).map(({ disease, ...item }) => ({
  ...item, content: diseaseContent(item.title, item.summary, disease),
  metadata: { catalogue: DISEASE_CATALOGUE, disease },
  keywords: [item.title, ...disease.aliases, disease.scientific_name],
  source_title: disease.sources[0].title, source_url: disease.sources[0].url,
}))
const json = JSON.stringify(rows).replaceAll("'", "''")
process.stdout.write(`-- PM ONLY: fdprawhpeoefpcnlbiya. Reviewed source summaries; not Dinas/POPT validation.
-- Idempotent insertion only: existing catalogue edits and all legacy KB records are preserved.
begin;
insert into public.knowledge_entries(doc_id,title,category,subcategory,summary,content,keywords,source_title,source_url,metadata,status,review_status,evidence_level)
select doc_id,title,'Penyakit Tanaman','Katalog referensi PM',summary,content,keywords,source_title,source_url,metadata,'published',
  'Ringkasan editorial berdasarkan publikasi pemerintah; belum divalidasi ahli.','Rujukan publik pemerintah; bukan pemeriksaan lapangan'
from jsonb_to_recordset('${json}'::jsonb) as item(doc_id text,title text,summary text,content text,keywords text[],source_title text,source_url text,metadata jsonb)
on conflict (doc_id) do nothing;
commit;
`)
