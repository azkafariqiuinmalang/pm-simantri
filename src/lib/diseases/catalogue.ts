export const DISEASE_CATALOGUE = 'pm-disease-v1'
export const DISEASE_COLUMNS = 'id,doc_id,title,summary,content,metadata,status,review_status,updated_at'
export const DISEASE_DISCLAIMER = 'Referensi edukasi, bukan diagnosis pasti. Gejala dapat saling menyerupai. Konsultasikan tanaman yang memburuk kepada POPT atau penyuluh; jangan menentukan pestisida hanya dari foto.'

export interface DiseaseSource { title: string; publisher: string; year: string; url: string }
export interface DiseaseGuide {
  scientific_name: string
  aliases: string[]
  parts: string[]
  symptoms: string[]
  prevention: string[]
  first_steps: string[]
  confused_with: string
  sources: DiseaseSource[]
  photo_reference: { url: string; label: string; credit: string }
}
export interface DiseaseEntry {
  id: string; doc_id: string; title: string; summary: string; content: string
  metadata: { catalogue: string; disease: DiseaseGuide }
  status: 'draft' | 'published'; review_status: string; updated_at: string
}

const officialHosts = new Set(['repository.pertanian.go.id', 'banten.brmp.pertanian.go.id', 'distankan.bulelengkab.go.id', 'dashboard.nganjukkab.go.id'])
export function officialSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && officialHosts.has(url.hostname) ? url.href : null
  } catch { return null }
}
function strings(value: unknown, max = 12): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.length <= max && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 600)
}
export function isDiseaseEntry(value: unknown): value is DiseaseEntry {
  if (!value || typeof value !== 'object') return false
  const row = value as DiseaseEntry
  const d = row.metadata?.disease
  return typeof row.id === 'string' && typeof row.doc_id === 'string' && typeof row.title === 'string' && typeof row.summary === 'string' &&
    typeof row.content === 'string' && typeof row.updated_at === 'string' && ['draft', 'published'].includes(row.status) &&
    row.metadata?.catalogue === DISEASE_CATALOGUE && !!d && typeof d.scientific_name === 'string' &&
    strings(d.aliases) && strings(d.parts) && strings(d.symptoms) && strings(d.prevention) && strings(d.first_steps) &&
    typeof d.confused_with === 'string' && Array.isArray(d.sources) && d.sources.length > 0 && d.sources.every(source =>
      source && typeof source === 'object' && typeof source.title === 'string' && typeof source.publisher === 'string' && typeof source.year === 'string' && !!officialSourceUrl(source.url)) &&
    !!d.photo_reference && !!officialSourceUrl(d.photo_reference.url) && typeof d.photo_reference.label === 'string' && typeof d.photo_reference.credit === 'string'
}
export function filterDiseases(entries: DiseaseEntry[], query: string, part = 'Semua'): DiseaseEntry[] {
  const words = query.toLocaleLowerCase('id-ID').trim().split(/\s+/).filter(Boolean)
  return entries.filter(entry => {
    const guide = entry.metadata.disease
    const text = [entry.title, entry.summary, guide.scientific_name, ...guide.aliases, ...guide.symptoms].join(' ').toLocaleLowerCase('id-ID')
    return (part === 'Semua' || guide.parts.includes(part)) && words.every(word => text.includes(word))
  })
}
export function diseaseContent(title: string, summary: string, d: DiseaseGuide): string {
  const list = (items: string[]) => items.map(item => `- ${item}`).join('\n')
  return `# ${title}\n\n${summary}\n\nPenyebab: ${d.scientific_name}.\n\n## Gejala yang diamati\n${list(d.symptoms)}\n\n## Pencegahan\n${list(d.prevention)}\n\n## Tindakan awal\n${list(d.first_steps)}\n\n## Jangan tertukar\n${d.confused_with}\n\n${DISEASE_DISCLAIMER}\n\n## Sumber\n${d.sources.map(s => `- [${s.title}](${s.url}) — ${s.publisher}, ${s.year}.`).join('\n')}\n\nRingkasan editorial SIMANTRI; belum divalidasi ahli. Bukan hasil pemeriksaan lapangan atau kerja sama resmi Dinas Pertanian.`
}

export interface DiseaseEdit { id: string; updated_at: string; title: string; summary: string; symptoms: string[]; prevention: string[]; first_steps: string[]; status: 'draft' | 'published' }
export function validateDiseaseEdit(input: unknown): DiseaseEdit | null {
  if (!input || typeof input !== 'object') return null
  const v = input as DiseaseEdit
  if (typeof v.id !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v.id) ||
    typeof v.updated_at !== 'string' || !Number.isFinite(Date.parse(v.updated_at)) ||
    typeof v.title !== 'string' || v.title.trim().length < 3 || v.title.length > 150 ||
    typeof v.summary !== 'string' || v.summary.trim().length < 10 || v.summary.length > 700 ||
    !strings(v.symptoms) || !strings(v.prevention) || !strings(v.first_steps) || !['draft', 'published'].includes(v.status)) return null
  return { id: v.id, updated_at: v.updated_at, title: v.title.trim(), summary: v.summary.trim(),
    symptoms: v.symptoms.map(s => s.trim()), prevention: v.prevention.map(s => s.trim()), first_steps: v.first_steps.map(s => s.trim()), status: v.status }
}
