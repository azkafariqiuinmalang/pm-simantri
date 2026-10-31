'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TrendingUp, RefreshCw, Globe2, ExternalLink } from 'lucide-react'
import { MetricCard, PageHeading, PriceLineChart } from '@/components/dashboard/DashboardUI'
import { useLanguage } from '@/components/ui/LanguageProvider'
import { jakartaToday, marketRetentionStart, pihpsPriceTypeInfo, PIHPS_PRICE_TYPES, type PihpsPriceType } from '@/lib/market/pihps'

interface RegionalPrice { id: string; tanggal: string; prov_id: number; provinsi: string; harga: number; updated_at?: string }
const rupiah = (value: number | null) => value === null ? 'Belum tersedia' : 'Rp ' + value.toLocaleString('id-ID') + '/kg'

export default function MarketInsightPage() {
  const [priceType, setPriceType] = useState<PihpsPriceType>(4)
  // A category change remounts all series state. Old prices must never appear
  // under a newly selected type, even while requests are still in flight.
  return <MarketInsightContent key={priceType} priceType={priceType} onPriceTypeChange={setPriceType} />
}

function MarketInsightContent({ priceType, onPriceTypeChange }: { priceType: PihpsPriceType; onPriceTypeChange: (value: PihpsPriceType) => void }) {
  const { t } = useLanguage()
  const typeInfo = pihpsPriceTypeInfo(priceType)
  const [date, setDate] = useState('')
  const [draftDate, setDraftDate] = useState('')
  const [province, setProvince] = useState('')
  const [provinceOptions, setProvinceOptions] = useState<Record<string, string>>({})
  const [days, setDays] = useState('30')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('highest')
  const [regional, setRegional] = useState<RegionalPrice[]>([])
  const [history, setHistory] = useState<RegionalPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [error, setError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [revision, setRevision] = useState(0)
  const requestSequence = useRef(0)

  const load = useCallback(async (signal?: AbortSignal) => {
    const sequence = ++requestSequence.current
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams({ price_type: String(priceType) })
      if (date) params.set('date', date)
      const response = await fetch('/api/market/regional?' + params, { cache: 'no-store', signal })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error?.message || 'Data regional tidak dapat dimuat.')
      if (signal?.aborted || sequence !== requestSequence.current) return
      const rows: RegionalPrice[] = json.data || []
      setRegional(rows)
      setProvinceOptions(previous => ({ ...previous, ...Object.fromEntries(rows.map(row => [String(row.prov_id), row.provinsi])) }))
      const defaultProvince = rows.find(row => row.provinsi === 'Jawa Timur') || rows[0]
      if (defaultProvince) setProvince(current => current || String(defaultProvince.prov_id))
      setRevision(value => value + 1)
    } catch (failure) {
      if (!signal?.aborted && sequence === requestSequence.current) {
        setRegional([])
        setError(failure instanceof Error ? failure.message : 'Data regional tidak dapat dimuat. Silakan coba kembali.')
      }
    } finally { if (!signal?.aborted && sequence === requestSequence.current) setLoading(false) }
  }, [date, priceType])

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => { void load(controller.signal) }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [load])

  const effectiveDate = regional[0]?.tanggal
  const historyEnd = date || effectiveDate || jakartaToday()
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    async function loadHistory() {
      try {
        const params = new URLSearchParams({ province, days, end: historyEnd, price_type: String(priceType) })
        const response = await fetch('/api/market/regional/history?' + params, { cache: 'no-store', signal: controller.signal })
        const json = await response.json()
        if (!response.ok) throw new Error(json.error?.message || 'Riwayat provinsi tidak dapat dimuat.')
        if (active) setHistory(json.data || [])
      } catch (failure) {
        if (active) setHistoryError(failure instanceof Error ? failure.message : 'Riwayat provinsi tidak dapat dimuat.')
      } finally { if (active) setHistoryLoading(false) }
    }
    const timer = window.setTimeout(() => {
      setHistory([]); setHistoryError(''); setHistoryLoading(Boolean(province))
      if (province) void loadHistory()
    }, 0)
    return () => { active = false; window.clearTimeout(timer); controller.abort() }
  }, [province, days, historyEnd, revision, priceType])

  const prices = useMemo(() => regional.map(row => Number(row.harga)).filter(value => Number.isFinite(value) && value > 0), [regional])
  const displayed = useMemo(() => regional.filter(row => row.provinsi.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) =>
    sort === 'name' ? a.provinsi.localeCompare(b.provinsi, 'id') : sort === 'lowest' ? Number(a.harga) - Number(b.harga) : Number(b.harga) - Number(a.harga)), [regional, search, sort])
  const points = history.map(row => ({ label: row.tanggal, value: Number(row.harga), source: 'PIHPS · ' + t(typeInfo.label) + ' · ' + row.provinsi }))
  const latest = history.at(-1)
  const previous = history.at(-2)
  const change = latest && previous ? Number(latest.harga) - Number(previous.harga) : null
  const provinceName = provinceOptions[province] || ''
  const lastSync = regional.map(row => row.updated_at || '').sort().at(-1)
  const maxPrice = prices.length ? Math.max(...prices) : 0

  return <div className="sim-page mx-auto max-w-7xl space-y-6">
    <PageHeading title={t('Market Insight PIHPS')} description={t('Empat jenis harga bawang merah ukuran sedang, dari produsen hingga konsumen. Bukan prediksi harga.')} icon={TrendingUp}
      action={<button type="button" onClick={() => { void load() }} disabled={loading} className="sim-button-secondary"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} />{t('Segarkan')}</button>} />
    <section className="sim-card-flat space-y-3 p-5" aria-label={t('Pilih jenis harga')}>
      <h2 className="text-sm font-bold">{t('Jenis harga')}</h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label={t('Pilih jenis harga')}>
        {PIHPS_PRICE_TYPES.map(type => <button key={type.id} type="button" aria-pressed={priceType === type.id} onClick={() => onPriceTypeChange(type.id)} className={priceType === type.id ? 'sim-button-primary justify-center' : 'sim-button-secondary justify-center'}>{t(type.label)}</button>)}
      </div>
      <p className="text-sm leading-6"><strong>{t(typeInfo.label)}</strong> · {t(typeInfo.description)}</p>
      <p className="text-xs leading-5 text-[var(--sim-color-muted)]">{t('Setiap jenis harga memiliki cakupan dan tanggal data sendiri. Data tidak dicampur; selisih antarjenis bukan otomatis keuntungan pedagang.')}</p>
    </section>
    <div className="sim-card-flat space-y-4 p-5">
      <form className="flex flex-wrap items-end gap-4" onSubmit={event => {
        event.preventDefault()
        const selected = new FormData(event.currentTarget).get('date')
        if (typeof selected === 'string') { setDraftDate(selected); if (selected === date) void load(); else setDate(selected) }
      }}>
        <label className="text-sm font-semibold">{t('Tanggal perbandingan')}<input name="date" aria-label={t('Tanggal perbandingan')} type="date" min={marketRetentionStart()} max={jakartaToday()} value={draftDate} onChange={event => setDraftDate(event.target.value)} className="mt-2 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-2.5" /></label>
        <button className="sim-button-primary" type="submit" disabled={loading}>{t('Terapkan tanggal')}</button>
        <button className="sim-button-secondary" onClick={() => { setDraftDate(''); if (date) setDate(''); else void load() }} type="button">{t('Tanggal terbaru tersedia')}</button>
        <p className="text-sm text-[var(--sim-color-muted)]">{t('Tanggal publikasi')}: {loading ? t('Memuat...') : effectiveDate || t('Data belum tersedia')}</p>
      </form>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--sim-color-muted)]">
        <a href={typeInfo.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[var(--theme-green)]"><ExternalLink className="h-3.5 w-3.5" />{t('Sumber: PIHPS Bank Indonesia')} — {t(typeInfo.label)}</a>
        {lastSync && !loading && <span>{t('Catatan diperbarui')}: {new Date(lastSync).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</span>}
      </div>
      <p className="text-xs leading-5 text-[var(--sim-color-muted)]">{t('Cakupan hanya provinsi yang dipublikasikan PIHPS pada tanggal tersebut. Bukan harga semua pasar atau harga khusus Nganjuk. Tanggal kosong tidak diisi dengan angka perkiraan.')}</p>
      {!loading && !date && effectiveDate && effectiveDate < jakartaToday() && <p role="status" className="text-sm">{t('Yang ditampilkan adalah publikasi terbaru yang tersimpan, bukan harga real-time hari ini.')}</p>}
    </div>
    {error && <p role="alert" className="sim-card-flat p-4">{t(error)}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label={t('Provinsi dengan data')} value={loading ? '...' : prices.length} hint={t('Cakupan publikasi pada tanggal perbandingan')} icon={Globe2} />
      <MetricCard label={t('Harga terendah')} value={loading ? '...' : rupiah(prices.length ? Math.min(...prices) : null)} icon={TrendingUp} />
      <MetricCard label={t('Harga tertinggi')} value={loading ? '...' : rupiah(maxPrice || null)} icon={TrendingUp} tone="amber" />
    </div>
    <section className="sim-card-flat space-y-4 p-5 sm:p-6" aria-busy={historyLoading}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-lg font-bold">{t('Riwayat harga provinsi')}{provinceName ? ' · ' + provinceName : ''}</h2><p className="mt-1 text-xs text-[var(--sim-color-muted)]">{t(typeInfo.label)} · {t('Akhir rentang')}: {historyEnd} · {days} {t('hari kalender')}</p></div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold">{t('Pilih provinsi')}<select aria-label={t('Pilih provinsi')} value={province} onChange={event => setProvince(event.target.value)} className="mt-1 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-3 text-sm"><option value="">{t('Pilih provinsi untuk melihat riwayat')}</option>{Object.entries(provinceOptions).sort((a, b) => a[1].localeCompare(b[1], 'id')).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label className="text-xs font-semibold">{t('Rentang grafik')}<select aria-label={t('Rentang grafik')} value={days} onChange={event => setDays(event.target.value)} className="mt-1 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-3 text-sm"><option value="7">{t('7 hari kalender')}</option><option value="30">{t('30 hari kalender')}</option><option value="60">{t('60 hari kalender')}</option></select></label>
        </div>
      </div>
      {historyError ? <p role="alert">{t(historyError)}</p> : historyLoading ? <p role="status">{t('Memuat riwayat...')}</p> : !province ? <p>{t('Pilih provinsi terlebih dahulu.')}</p> : !history.length ? <p>{t('Belum ada riwayat tersimpan untuk provinsi dan rentang ini.')}</p> : <>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--theme-line)] p-4"><p className="text-xs text-[var(--sim-color-muted)]">{t('Harga terakhir dalam rentang')}</p><p className="mt-1 font-bold">{rupiah(Number(latest!.harga))}</p><p className="mt-1 text-xs">{latest!.tanggal}</p></div>
          <div className="rounded-xl border border-[var(--theme-line)] p-4"><p className="text-xs text-[var(--sim-color-muted)]">{t('Perubahan dari publikasi sebelumnya')}</p><p className="mt-1 font-bold">{change === null ? t('Belum mencukupi') : (change > 0 ? '+' : change < 0 ? '−' : '') + 'Rp ' + Math.abs(change).toLocaleString('id-ID') + '/kg'}</p><p className="mt-1 text-xs">{previous ? previous.tanggal + ' → ' + latest!.tanggal : t('Perlu sedikitnya dua catatan')}</p></div>
          <div className="rounded-xl border border-[var(--theme-line)] p-4"><p className="text-xs text-[var(--sim-color-muted)]">{t('Catatan tersedia dalam rentang')}</p><p className="mt-1 font-bold">{history.length} {t('publikasi')}</p><p className="mt-1 text-xs">{t('Bukan jumlah hari berturut-turut')}</p></div>
        </div>
        <PriceLineChart points={points} calendarScale />
      </>}
      <p className="text-xs leading-5 text-[var(--sim-color-muted)]">{t('Tanggal tanpa publikasi tidak diisi dengan harga sintetis. Grafik menghubungkan catatan yang tersedia, bukan hasil peramalan. Perubahan dihitung terhadap publikasi sebelumnya, bukan selalu terhadap kemarin.')}</p>
      <p className="text-xs text-[var(--sim-color-muted)]">{t('Penyimpanan dibatasi 60 hari kalender terakhir; data yang lebih lama dibersihkan setelah Admin menyelesaikan sinkronisasi.')}</p>
    </section>
    <section className="sim-card-flat space-y-4 p-5" aria-busy={loading}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-lg font-bold">{t('Perbandingan harga antarprovinsi')}</h2><p className="mt-1 text-xs text-[var(--sim-color-muted)]">{t(typeInfo.label)} · {effectiveDate || '—'}</p></div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold">{t('Cari provinsi')}<input aria-label={t('Cari provinsi')} value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Nama provinsi')} className="mt-1 block w-44 rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-2.5 text-sm" /></label>
          <label className="text-xs font-semibold">{t('Urutkan harga')}<select aria-label={t('Urutkan harga')} value={sort} onChange={event => setSort(event.target.value)} className="mt-1 block rounded-xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-2.5 text-sm"><option value="highest">{t('Harga tertinggi')}</option><option value="lowest">{t('Harga terendah')}</option><option value="name">{t('Nama provinsi')}</option></select></label>
        </div>
      </div>
      {loading ? <p role="status">{t('Memuat data...')}</p> : error ? <p>{t('Perbandingan belum dapat ditampilkan.')}</p> : !regional.length ? <p>{t('Tidak ada data tersimpan untuk jenis harga dan tanggal ini. Pilih tanggal lain atau tanggal terbaru tersedia.')}</p> : !displayed.length ? <p>{t('Provinsi tidak ditemukan pada tanggal ini.')}</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">{t('Harga per provinsi berdasarkan PIHPS')} · {t(typeInfo.label)}</caption><thead><tr className="border-b border-[var(--theme-line)]"><th scope="col" className="p-3">{t('Provinsi')}</th><th scope="col" className="p-3">{t('Tanggal publikasi')}</th><th scope="col" className="p-3">{t('Harga per kg')}</th><th scope="col" className="p-3">{t('Riwayat')}</th></tr></thead><tbody>{displayed.map(row => <tr key={row.id} className={'border-b border-[var(--theme-line)] ' + (String(row.prov_id) === province ? 'bg-[var(--sim-green-50)]/40' : '')}><td className="p-3 font-semibold">{row.provinsi}</td><td className="whitespace-nowrap p-3">{row.tanggal}</td><td className="min-w-40 p-3"><span className="sim-tabular">{rupiah(Number(row.harga))}</span><div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--theme-line)]"><div className="h-full rounded-full bg-emerald-600" style={{ width: (Number(row.harga) / maxPrice * 100) + '%' }} /></div></td><td className="p-3"><button type="button" onClick={() => setProvince(String(row.prov_id))} className="sim-button-secondary" aria-label={t('Lihat riwayat') + ' ' + row.provinsi}>{t('Lihat riwayat')}</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>
}
