'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Database, ExternalLink, Square } from 'lucide-react'
import { PageHeading } from '@/components/dashboard/DashboardUI'
import { useLanguage } from '@/components/ui/LanguageProvider'
import { calendarDates, jakartaToday, marketRetentionStart, PIHPS_PRICE_TYPES } from '@/lib/market/pihps'

interface Price { id: string; tanggal: string; harga: number; source: string; region_name: string }
interface SyncResult { date: string; price_type: number; type_label: string; status: string; regional_count?: number; source_dates?: string[]; message?: string }
interface RetentionResult { cutoff_date: string; through_date: string; deleted_regional: number; deleted_legacy: number }
const statusLabels: Record<string, string> = {
  synced: 'Tersimpan', no_data: 'Tidak ada data', no_publication: 'Tidak ada publikasi tanggal ini',
  invalid_data: 'Data tidak valid', partial: 'Tersimpan sebagian', error: 'Gagal',
}

export default function AdminMarketInputPage() {
  const { t } = useLanguage()
  const [prices, setPrices] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [endDate, setEndDate] = useState(jakartaToday)
  const [days, setDays] = useState('30')
  const [priceType, setPriceType] = useState('all')
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [retention, setRetention] = useState<RetentionResult | null>(null)
  const [results, setResults] = useState<SyncResult[]>([])
  const [total, setTotal] = useState(0)
  const [currentDate, setCurrentDate] = useState('')
  const [stopping, setStopping] = useState(false)
  const stopRequested = useRef(false)

  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const response = await fetch('/api/market/price/history?days=60', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok) throw new Error()
      setPrices(json.data || [])
    } catch { setLoadError('Riwayat harga tidak dapat dimuat.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => { window.clearTimeout(timer); stopRequested.current = true }
  }, [load])

  async function sync(rangeDays: number, end: string, latest = false) {
    if (syncing) return
    const dates = calendarDates(end, rangeDays)
    if (!dates.length || end > jakartaToday() || dates[0] < marketRetentionStart()) {
      setError('Rentang sinkronisasi harus berada dalam 60 hari kalender terakhir.'); return
    }
    stopRequested.current = false
    const types = PIHPS_PRICE_TYPES.filter(type => latest || priceType === 'all' || String(type.id) === priceType)
    setSyncing(true); setStopping(false); setError(''); setMessage(''); setRetention(null); setResults([]); setTotal(dates.length * types.length)
    const completed: SyncResult[] = []
    try {
      // One bounded request per date/type. Never fan out a large concurrent batch.
      tasks: for (const date of dates) {
        for (const type of types) {
          if (stopRequested.current) break tasks
          setCurrentDate(date + ' · ' + t(type.label))
          try {
            const response = await fetch('/api/market/sync-pihps', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: latest ? 'latest' : 'today', tanggal: date, price_type: type.id }),
            })
            const json = await response.json()
            const rows = json.data?.results || []
            completed.push(...(rows.length ? rows : [{ date, status: 'error', message: json.error?.message || 'Sinkronisasi gagal.' }]).map((row: Omit<SyncResult, 'price_type' | 'type_label'>) => ({ ...row, price_type: type.id, type_label: type.label })))
            setResults([...completed])
            if (response.status === 401 || response.status === 403) {
              setError(json.error?.message || 'Sesi Admin tidak tersedia. Silakan masuk kembali.'); break tasks
            }
          } catch {
            completed.push({ date, price_type: type.id, type_label: type.label, status: 'error', message: 'Permintaan gagal. Periksa koneksi dan coba ulang tanggal ini.' })
            setResults([...completed])
          }
        }
      }
      const saved = completed.filter(row => row.status === 'synced').length
      const failed = completed.filter(row => ['error', 'partial', 'invalid_data'].includes(row.status)).length
      const unavailable = completed.filter(row => ['no_data', 'no_publication'].includes(row.status)).length
      setMessage(saved + ' ' + t('kombinasi tanggal dan jenis tersimpan') + ' · ' + unavailable + ' ' + t('tanpa publikasi') + ' · ' + failed + ' ' + t('bermasalah') + (stopRequested.current ? ' · ' + t('Dihentikan setelah permintaan aktif selesai.') : ''))
      // Cleanup is a separate atomic database operation, only after a healthy,
      // completed sync. Failure/cancellation must not trigger destructive work.
      if (saved > 0 && failed === 0 && !stopRequested.current) {
        try {
          const response = await fetch('/api/market/retention', { method: 'POST' })
          const json = await response.json()
          if (!response.ok || !json.data) throw new Error()
          setRetention(json.data)
        } catch {
          setError('Harga berhasil diperbarui, tetapi pembersihan riwayat belum berhasil. Silakan ulangi sinkronisasi.')
        }
      }
    } finally {
      setCurrentDate(''); await load(); setSyncing(false); setStopping(false)
    }
  }

  return <div className="sim-page mx-auto max-w-5xl space-y-6">
    <PageHeading title={t('Sinkronisasi Harga PIHPS')} description={t('Kelola empat jenis harga bawang merah ukuran sedang untuk database PM. Setiap jenis disimpan terpisah, tanpa prediksi.')} icon={Database}
      action={<Link href="/dashboard/harga" className="sim-button-secondary">{t('Lihat Market Insight')}</Link>} />
    <section className="sim-card-flat space-y-5 p-5 sm:p-6">
      <div className="space-y-2 text-sm leading-6">
        <p>{t('Tanggal publikasi diperiksa sebelum penyimpanan. Data Jumat yang dikembalikan PIHPS untuk akhir pekan tidak dicatat ulang sebagai harga Sabtu atau Minggu.')}</p>
        <p>{t('Harga Jawa Timur hanya disimpan jika tersedia pada sumber; bukan pengganti harga Kabupaten Nganjuk atau Pasar Sukomoro.')}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">{PIHPS_PRICE_TYPES.map(type => <a key={type.id} href={type.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-[var(--theme-green)]"><ExternalLink className="h-4 w-4" />{t(type.label)}</a>)}</div>
      </div>
      <div className="space-y-3 rounded-xl border border-[var(--theme-line)] p-4">
        <button onClick={() => { void sync(1, jakartaToday(), true) }} disabled={syncing} type="button" className="sim-button-primary"><RefreshCw className={'h-4 w-4 ' + (syncing ? 'animate-spin' : '')} />{t(syncing ? 'Menyinkronkan...' : 'Sinkronisasi harga terbaru')}</button>
        <p className="text-sm leading-6">{t('Sekali klik untuk mengambil harga terbaru keempat jenis dari PIHPS. Tanggal mengikuti sumber, bukan dipaksa menjadi tanggal hari ini.')}</p>
        <p className="text-xs leading-5 text-[var(--sim-color-muted)]">{t('Setelah sinkronisasi berhasil, riwayat harga di luar 60 hari kalender terakhir dihapus permanen. Pembersihan hanya saat sinkronisasi, bukan otomatis saat berganti hari. Kegagalan atau pembatalan sinkronisasi tidak memicu pembersihan.')}</p>
      </div>
      <details className="space-y-4">
        <summary className="cursor-pointer text-sm font-semibold">{t('Opsi sinkronisasi rentang')}</summary>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm font-semibold">{t('Jenis harga')}<select aria-label={t('Jenis harga')} value={priceType} disabled={syncing} onChange={event => setPriceType(event.target.value)} className="mt-2 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-3"><option value="all">{t('Semua jenis harga')}</option>{PIHPS_PRICE_TYPES.map(type => <option key={type.id} value={type.id}>{t(type.label)}</option>)}</select></label>
        <label className="text-sm font-semibold">{t('Tanggal akhir sinkronisasi')}
          <input aria-label={t('Tanggal akhir sinkronisasi')} type="date" min={marketRetentionStart()} max={jakartaToday()} value={endDate} disabled={syncing} onChange={event => setEndDate(event.target.value)} className="mt-2 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-3" />
        </label>
        <label className="text-sm font-semibold">{t('Rentang sinkronisasi')}
          <select aria-label={t('Rentang sinkronisasi')} value={days} disabled={syncing} onChange={event => setDays(event.target.value)} className="mt-2 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-3">
            <option value="1">{t('1 hari')}</option><option value="7">{t('7 hari kalender')}</option><option value="30">{t('30 hari kalender')}</option><option value="60">{t('60 hari kalender')}</option>
          </select>
        </label>
        <button onClick={() => { void sync(Number(days), endDate) }} disabled={syncing || !endDate} type="button" className="sim-button-primary"><RefreshCw className={'h-4 w-4 ' + (syncing ? 'animate-spin' : '')} />{t(syncing ? 'Menyinkronkan...' : 'Sinkronkan rentang')}</button>
      </div>
      </details>
      {syncing && <div className="space-y-3">
        <p role="status" aria-live="polite" className="text-sm">{results.length}/{total} · {currentDate} · {t(stopping ? 'Menunggu permintaan aktif selesai...' : 'Memeriksa publikasi PIHPS...')}</p>
        <progress value={results.length} max={total} aria-label={t('Progres sinkronisasi')} className="h-3 w-full accent-emerald-600" />
        <button type="button" className="sim-button-secondary" disabled={stopping} onClick={() => { stopRequested.current = true; setStopping(true) }}><Square className="h-4 w-4" />{t('Hentikan setelah permintaan ini')}</button>
      </div>}
      {error && <p role="alert">{t(error)}</p>}
      {message && <p role="status" className="text-sm font-semibold">{message}</p>}
      {retention && <div role="status" className="rounded-xl border border-[var(--theme-line)] p-4 text-sm leading-6"><p>{t('Rentang penyimpanan')}: <strong>{retention.cutoff_date} — {retention.through_date}</strong> · {t('60 hari kalender')}</p><p>{t('Catatan lama dibersihkan')}: {retention.deleted_regional + retention.deleted_legacy} ({retention.deleted_regional} {t('regional')}, {retention.deleted_legacy} {t('riwayat produsen Jawa Timur')}).</p></div>}
      {!!results.length && <div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm">
        <caption className="mb-3 text-left font-semibold">{t('Hasil per tanggal dan jenis harga — pengulangan tidak membuat duplikat.')}</caption>
        <thead><tr className="border-b border-[var(--theme-line)]"><th scope="col" className="p-3">{t('Tanggal data / pemeriksaan')}</th><th scope="col" className="p-3">{t('Jenis harga')}</th><th scope="col" className="p-3">{t('Status')}</th><th scope="col" className="p-3">{t('Provinsi')}</th><th scope="col" className="p-3">{t('Keterangan')}</th></tr></thead>
        <tbody>{results.map(row => <tr key={row.date + ':' + row.price_type} className="border-b border-[var(--theme-line)]"><td className="whitespace-nowrap p-3">{row.date}</td><td className="p-3">{t(row.type_label)}</td><td className="p-3">{t(statusLabels[row.status] || row.status)}</td><td className="p-3">{row.regional_count ?? 0}</td><td className="min-w-52 p-3">{row.message ? t(row.message) : '—'}{row.source_dates?.length ? <span className="mt-1 block text-xs text-[var(--sim-color-muted)]">{t('Tanggal pada sumber')}: {row.source_dates.join(', ')}</span> : null}</td></tr>)}</tbody>
      </table></div>}
      <p className="text-xs leading-5 text-[var(--sim-color-muted)]">{t('Sinkronisasi dijalankan oleh Admin saat halaman ini terbuka. Jadwal otomatis belum diaktifkan. Tidak ada harga sintetis atau penyalinan data dari versi lomba.')}</p>
    </section>
    <section className="sim-card-flat space-y-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{t('Riwayat produsen Jawa Timur — 60 hari kalender')}</h2><button type="button" className="sim-button-secondary" disabled={loading || syncing} onClick={() => { void load() }}>{t('Segarkan riwayat')}</button></div>
      <p className="text-xs text-[var(--sim-color-muted)]">{t('Ringkasan ini khusus produsen. Riwayat setiap jenis harga dan provinsi tersedia di Market Insight.')}</p>
      {loadError ? <p role="alert">{t(loadError)}</p> : loading ? <p role="status">{t('Memuat...')}</p> : !prices.length ? <p>{t('Data harga belum tersedia.')}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th scope="col" className="p-3">{t('Tanggal publikasi')}</th><th scope="col" className="p-3">{t('Harga per kg')}</th><th scope="col" className="p-3">{t('Sumber')}</th></tr></thead><tbody>{prices.map(row => <tr key={row.id} className="border-t border-[var(--theme-line)]"><td className="p-3">{row.tanggal}</td><td className="p-3">Rp {Number(row.harga).toLocaleString('id-ID')}</td><td className="p-3">{row.source === 'scraping' ? 'PIHPS · ' + row.region_name : t('Catatan manual Admin')}</td></tr>)}</tbody></table></div>}
    </section>
  </div>
}
