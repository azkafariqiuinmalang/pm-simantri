'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { BookOpen, Save } from 'lucide-react'
import { PageHeading } from '@/components/dashboard/DashboardUI'
import { createClient } from '@/lib/supabase/client'
import { DISEASE_CATALOGUE, DISEASE_COLUMNS, isDiseaseEntry, type DiseaseEntry } from '@/lib/diseases/catalogue'

export default function AdminDiseasePage() {
  const [entries, setEntries] = useState<DiseaseEntry[]>([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data, error } = await createClient().from('knowledge_entries').select(DISEASE_COLUMNS)
          .eq('category', 'Penyakit Tanaman').contains('metadata', { catalogue: DISEASE_CATALOGUE }).order('title')
        if (error) throw error
        const valid = (data || []).filter(isDiseaseEntry)
        if (valid.length !== (data || []).length) throw new Error('Invalid structure')
        if (active) { setEntries(valid); setSelected(valid[0]?.id || ''); setError('') }
      } catch { if (active) setError('Katalog gagal dimuat. Coba muat ulang.') }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [revision])
  const entry = entries.find(item => item.id === selected)
  return <div className="sim-page mx-auto max-w-5xl space-y-6">
    <PageHeading title="Kelola informasi penyakit" description="Sunting materi katalog dan atur publikasinya. Perubahan disimpan ke database PM, bukan database lomba." icon={BookOpen} action={<Link href="/dashboard/penyakit" className="sim-button-secondary">Lihat katalog petani</Link>} />
    <div className="sim-card-flat p-5 text-sm leading-6"><p>Rujukan dan kredit foto dipertahankan dari kurasi awal. Publikasi bukan validasi ahli. Editor ini mengelola empat materi awal; penambahan penyakit dan unggah foto berizin belum tersedia.</p></div>
    {loading ? <p role="status">Memuat katalog Admin...</p> : error ? <p role="alert">{error}</p> : !entries.length ? <p>Belum ada materi katalog.</p> : <>
      <label className="block text-sm font-bold" htmlFor="disease-select">Pilih materi</label>
      <p className="text-xs text-[var(--sim-color-muted)]">Simpan perubahan sebelum berpindah materi atau memuat ulang katalog.</p>
      <select id="disease-select" value={selected} onChange={e => setSelected(e.target.value)} className="w-full rounded-xl border border-[var(--sim-color-border)] bg-[var(--theme-surface)] p-3 text-sm">{entries.map(item => <option key={item.id} value={item.id}>{item.title} — {item.status === 'published' ? 'Dipublikasikan' : 'Draft'}</option>)}</select>
      {entry && <DiseaseEditor key={`${entry.id}:${revision}`} entry={entry} onSaved={saved => setEntries(items => items.map(item => item.id === saved.id ? saved : item))} />}
    </>}
    <button type="button" className="sim-button-secondary" onClick={() => { setLoading(true); setRevision(v => v + 1) }}>Muat ulang katalog</button>
  </div>
}

function DiseaseEditor({ entry, onSaved }: { entry: DiseaseEntry; onSaved: (entry: DiseaseEntry) => void }) {
  const [version, setVersion] = useState(entry.updated_at)
  const [title, setTitle] = useState(entry.title)
  const [summary, setSummary] = useState(entry.summary)
  const [symptoms, setSymptoms] = useState(entry.metadata.disease.symptoms.join('\n'))
  const [prevention, setPrevention] = useState(entry.metadata.disease.prevention.join('\n'))
  const [steps, setSteps] = useState(entry.metadata.disease.first_steps.join('\n'))
  const [status, setStatus] = useState(entry.status)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const inputClass = 'mt-2 w-full rounded-xl border border-[var(--sim-color-border)] bg-[var(--theme-surface)] p-3 text-sm font-normal leading-6'
  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setMessage(''); setFailed(false)
    const lines = (value: string) => value.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const response = await fetch('/api/diseases', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: entry.id, updated_at: version, title, summary, symptoms: lines(symptoms), prevention: lines(prevention), first_steps: lines(steps), status }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Materi gagal disimpan.')
      if (!isDiseaseEntry(result.data)) throw new Error('Respons penyimpanan tidak valid. Muat ulang katalog untuk memeriksa hasilnya.')
      setVersion(result.data.updated_at); onSaved(result.data)
      setMessage(result.data.status === 'published' ? 'Tersimpan. Materi dipublikasikan pada katalog petani.' : 'Tersimpan sebagai draft. Materi tidak ditampilkan pada katalog petani.')
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : 'Penyimpanan gagal. Coba lagi.') }
    finally { setSaving(false) }
  }
  return <form onSubmit={save} className="sim-card-flat space-y-5 p-5 sm:p-7">
    <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
      <legend className="mb-4 text-lg font-bold">Sunting materi</legend>
      <label className="block text-sm font-bold">Judul<input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} minLength={3} required className={inputClass} /></label>
      <label className="block text-sm font-bold">Ringkasan<textarea value={summary} onChange={e => setSummary(e.target.value)} rows={3} maxLength={700} minLength={10} required className={inputClass} /></label>
      <p className="text-xs text-[var(--sim-color-muted)]">Untuk daftar di bawah, tulis satu butir per baris. Maksimal 12 butir, masing-masing 600 karakter. Sesuaikan dengan rujukan yang tercantum.</p>
      {([['Gejala yang diamati', symptoms, setSymptoms], ['Pencegahan', prevention, setPrevention], ['Tindakan awal', steps, setSteps]] as const).map(([label, value, setValue]) => <label key={label} className="block text-sm font-bold">{label}<textarea value={value} onChange={e => setValue(e.target.value)} rows={4} maxLength={7200} required className={inputClass} /></label>)}
      <label className="block text-sm font-bold">Status publikasi<select value={status} onChange={e => setStatus(e.target.value as 'draft' | 'published')} className={inputClass}><option value="draft">Draft — tidak ditampilkan ke petani</option><option value="published">Dipublikasikan — tampil ke petani</option></select></label>
      <div className="rounded-xl border border-[var(--sim-color-border)] p-4 text-xs leading-6"><p className="font-bold">Rujukan tetap</p>{entry.metadata.disease.sources.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a> · {s.publisher}</p>)}<p className="mt-2">{entry.review_status}</p></div>
      <button type="submit" className="sim-button-primary inline-flex items-center gap-2"><Save className="h-4 w-4" aria-hidden="true" />{saving ? 'Menyimpan...' : 'Simpan perubahan'}</button>
    </fieldset>
    {message && <p role={failed ? 'alert' : 'status'} className="text-sm leading-6">{message}</p>}
  </form>
}
