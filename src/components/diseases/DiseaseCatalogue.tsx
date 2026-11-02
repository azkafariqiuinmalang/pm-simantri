'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Bot, ChevronDown, ImageIcon, Leaf, Search, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/components/ui/LanguageProvider'
import { DISEASE_CATALOGUE, DISEASE_COLUMNS, DISEASE_DISCLAIMER, filterDiseases, isDiseaseEntry, type DiseaseEntry } from '@/lib/diseases/catalogue'

export default function DiseaseCatalogue() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<DiseaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [part, setPart] = useState('Semua')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data, error } = await createClient().from('knowledge_entries').select(DISEASE_COLUMNS)
          .eq('category', 'Penyakit Tanaman').eq('status', 'published').contains('metadata', { catalogue: DISEASE_CATALOGUE }).order('title')
        if (error) throw error
        const valid = (data || []).filter(isDiseaseEntry)
        if (valid.length !== (data || []).length) throw new Error('Format katalog tidak lengkap')
        if (active) { setEntries(valid); setError('') }
      } catch {
        if (active) setError('Katalog belum dapat dimuat. Periksa koneksi dan coba kembali.')
      } finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [retry])
  const visible = filterDiseases(entries, query, part)
  return <div className="pm-module">
    <header className="pm-hero"><div className="flex flex-wrap gap-2"><span className="pm-badge">{t('Referensi publikasi pertanian')}</span><span className="pm-badge">{t('Pencocokan gejala secara manual')}</span></div><h1>{t('Katalog Informasi Penyakit Bawang Merah')}</h1><p>{t('Kenali ciri penyakit, baca langkah pencegahan, dan bandingkan foto pada sumber resmi. Materi disajikan sebagai panduan untuk memahami kondisi tanaman.')}</p><div className="pm-soft mt-6 flex items-start gap-3 text-xs leading-6"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--theme-green)]" /><span>{t(DISEASE_DISCLAIMER)}</span></div></header>
    <section className="pm-panel overflow-hidden !p-0" aria-label={t('Cara menggunakan katalog')}>
      <div className="border-b border-[var(--sim-color-border)] bg-[var(--sim-green-50)]/50 p-5 dark:bg-[var(--theme-raised)] sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sim-color-primary)] dark:text-[var(--theme-green)]">{t('Katalog referensi • pencocokan manual')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[['01', 'Amati tanaman', 'Perhatikan daun, akar dan pangkal umbi.'], ['02', 'Bandingkan gejala', 'Baca ciri pembeda dan foto pada sumber resmi.'], ['03', 'Tindak lanjuti', 'Utamakan pencegahan dan konsultasi POPT.']].map(([n, title, description]) => <div key={n} className="flex gap-3">
            <span className="text-2xl font-light text-[var(--sim-color-muted)]" aria-hidden="true">{n}</span><div><h2 className="text-sm font-bold">{t(title)}</h2><p className="mt-1 text-xs leading-5 text-[var(--sim-color-muted)]">{t(description)}</p></div>
          </div>)}
        </div>
      </div>
      <p className="px-5 py-4 text-xs leading-6 text-[var(--sim-color-muted)]">{t(DISEASE_DISCLAIMER)} {t('Tidak ada unggah foto atau diagnosis otomatis.')}</p>
    </section>
    <section aria-label={t('Pencarian katalog')} className="space-y-3">
      <label htmlFor="disease-search" className="block text-sm font-bold">{t('Cari nama penyakit atau gejala')}</label>
      <div className="relative"><Search className="absolute left-4 top-3.5 h-5 w-5 text-[var(--sim-color-muted)]" aria-hidden="true" /><input id="disease-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('Misalnya: daun menguning, moler, bercak putih')} maxLength={150} className="w-full rounded-xl border border-[var(--sim-color-border)] bg-[var(--theme-surface)] py-3 pr-4 pl-12 text-sm" /></div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('Bagian tanaman')}>
        {['Semua', 'Daun', 'Akar & umbi'].map(value => <button key={value} type="button" onClick={() => setPart(value)} aria-pressed={part === value} className={`rounded-full border px-4 py-2 text-xs font-semibold ${part === value ? 'border-[var(--sim-green-600)] bg-[var(--sim-green-600)] text-white' : 'border-[var(--sim-color-border)] bg-[var(--theme-surface)] text-[var(--sim-color-body)]'}`}>{t(value)}</button>)}
        {!loading && !error && <p role="status" className="ml-auto text-xs text-[var(--sim-color-muted)]">{visible.length} {t('dari')} {entries.length} {t('materi')}</p>}
      </div>
    </section>
    {loading ? <p role="status">{t('Memuat katalog penyakit...')}</p> : error ? <div className="sim-card-flat p-6"><p role="alert">{t(error)}</p><button type="button" className="sim-button-secondary mt-4" onClick={() => { setLoading(true); setRetry(v => v + 1) }}>{t('Coba lagi')}</button></div> : !entries.length ? <p className="sim-card-flat p-6">{t('Materi katalog belum dipublikasikan oleh Admin.')}</p> : !visible.length ? <div className="sim-card-flat p-6"><p>{t('Tidak ada materi yang cocok. Coba kata lain atau tampilkan semua bagian tanaman.')}</p><button className="sim-button-secondary mt-4" onClick={() => { setQuery(''); setPart('Semua') }}>{t('Reset pencarian')}</button></div> : <div className="grid items-start gap-5 lg:grid-cols-2">
      {visible.map(entry => {
        const guide = entry.metadata.disease
        const sections: [string, string[]][] = [['Pencegahan', guide.prevention], ['Tindakan awal', guide.first_steps]]
        return <article key={entry.id} className="pm-harvest-card overflow-hidden">
          <a href={guide.photo_reference.url} target="_blank" rel="noopener noreferrer" className="relative flex min-h-36 items-center justify-between gap-4 bg-[var(--theme-green-soft)] p-6"><div><span className="pm-badge !bg-[var(--theme-surface)]">{entry.doc_id}</span><p className="mt-5 flex items-center gap-2 text-xs font-bold text-[var(--theme-green)]"><ImageIcon className="h-4 w-4" />{t('Lihat foto pada dokumen resmi')}<ArrowUpRight className="h-4 w-4" /></p></div><Leaf className="h-16 w-16 shrink-0 text-[var(--theme-green)] opacity-25" aria-hidden="true" /></a>
          <div className="border-b border-[var(--sim-color-border)] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3"><Leaf className="h-6 w-6 text-[var(--sim-color-primary)] dark:text-[var(--theme-green)]" aria-hidden="true" /><span className="text-xs text-[var(--sim-color-muted)]">{guide.parts.map(p => t(p)).join(' · ')}</span></div>
            <h2 className="mt-4 text-xl font-bold tracking-tight">{entry.title}</h2><p className="mt-1 text-xs italic text-[var(--sim-color-muted)]">{guide.scientific_name}</p><p className="mt-3 text-sm leading-6 text-[var(--sim-color-body)]">{entry.summary}</p>
          </div>
          <div className="p-5 sm:p-6">
            <div className="pm-soft"><h3 className="text-xs font-bold uppercase tracking-wide text-[var(--theme-green)]">{t('Gejala yang dapat diamati')}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--sim-color-body)]">{guide.symptoms.map((s, i) => <li key={i}>{s}</li>)}</ul></div>
            <div className="mt-5 space-y-3 text-sm leading-6"><p><ShieldCheck className="mr-2 inline h-4 w-4 text-[var(--theme-green)]" /><strong>{t('Pencegahan')}: </strong>{guide.prevention[0]}</p><p><Leaf className="mr-2 inline h-4 w-4 text-[var(--theme-rose)]" /><strong>{t('Tindakan awal')}: </strong>{guide.first_steps[0]}</p></div>
            <details className="group mt-5 border-t border-[var(--sim-color-border)] pt-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-[var(--sim-color-primary)] dark:text-[var(--theme-green)]">{t('Pencegahan, tindakan & sumber')}<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
              <div className="mt-5 space-y-5">
                {sections.map(([title, items]) => <section key={title}><h3 className="text-sm font-bold">{t(title)}</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--sim-color-body)]">{items.map((item, i) => <li key={i}>{item}</li>)}</ul></section>)}
                <section className="rounded-xl border border-[var(--sim-color-border)] p-4"><h3 className="text-sm font-bold">{t('Jangan tertukar')}</h3><p className="mt-2 text-sm leading-6">{guide.confused_with}</p></section>
                <section className="rounded-xl bg-[var(--sim-green-50)]/60 p-4 dark:bg-[var(--theme-raised)]">
                  <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4" aria-hidden="true" /><h3 className="text-sm font-bold">{t('Foto pada dokumen resmi')}</h3></div>
                  <p className="mt-2 text-xs leading-5 text-[var(--sim-color-muted)]">{guide.photo_reference.label}. {guide.photo_reference.credit}</p>
                  <a href={guide.photo_reference.url} target="_blank" rel="noopener noreferrer" className="sim-button-secondary mt-3 inline-flex items-center gap-2 text-xs">{t('Lihat foto di sumber')}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
                  <p className="mt-2 text-xs leading-5 text-[var(--sim-color-muted)]">{t('Tautan membuka PDF eksternal. Jika tidak langsung menuju gambar, buka nomor halaman PDF di atas. Foto belum disalin ke aplikasi.')}</p>
                </section>
                <section><h3 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4" aria-hidden="true" />{t('Rujukan materi')}</h3><ul className="mt-3 space-y-3">{guide.sources.map(source => <li key={source.url} className="text-xs leading-5"><a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">{source.title} ↗</a><p className="mt-1 text-[var(--sim-color-muted)]">{source.publisher} · {source.year}</p></li>)}</ul></section>
                <p className="border-t border-[var(--sim-color-border)] pt-3 text-xs leading-5 text-[var(--sim-color-muted)]">{t('Ringkasan editorial SIMANTRI berdasarkan rujukan publik; belum divalidasi ahli dan bukan bukti pemeriksaan lapangan. Sumber lama tidak digunakan sebagai daftar dosis atau registrasi pestisida terkini.')}</p>
              </div>
            </details>
            <Link href="/dashboard/chat" className="sim-button-primary mt-5 flex justify-center"><Bot className="h-4 w-4" />{t('Tanyakan panduan ke SIMA')}</Link>
          </div>
        </article>
      })}
    </div>}
    <aside className="pm-contact-banner flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-bold">{t('Masih ragu dengan gejala tanaman?')}</h2><p>{t('Baca rujukan lengkap dan gunakan SIMA untuk mempelajari panduan. Untuk memastikan penyakit, konsultasikan kondisi tanaman kepada POPT atau penyuluh setempat.')}</p></div><Link href="/dashboard/chat" className="sim-button-secondary shrink-0 !bg-white !text-emerald-900"><Bot className="h-4 w-4" />{t('Buka SIMA')}</Link></aside>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sim-color-border)] pt-5 text-xs text-[var(--sim-color-muted)]"><p>{t('Materi teknis berasal dari publikasi pemerintah, bukan integrasi langsung database dinas.')}</p><Link href="/dunia-brambang" className="font-semibold underline">{t('Jelajahi Dunia Brambang')}</Link></footer>
  </div>
}
