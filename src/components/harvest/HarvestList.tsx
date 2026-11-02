'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight, ClipboardList, Leaf, MapPin, Package, Plus, RefreshCw, Search, Wallet } from 'lucide-react'
import { STATUS_LABELS, VARIETIES, kilograms, rupiah, type HarvestListing } from '@/lib/harvest/shared'
import { HarvestBadge, HarvestEmpty, HarvestLocation, HarvestNav, HarvestNotice, HarvestPhoto, harvestFetch, jsonRequest } from './HarvestUI'

type Result = { data: HarvestListing[]; total: number; page_size: number }
export default function HarvestList({ mine = false }: { mine?: boolean }) {
  const [rows, setRows] = useState<HarvestListing[]>([]), [total, setTotal] = useState(0)
  const [query, setQuery] = useState(''), [draftQuery, setDraftQuery] = useState(''), [status, setStatus] = useState(''), [variety, setVariety] = useState(''), [sort, setSort] = useState('newest'), [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(''), [message, setMessage] = useState(''), [confirm, setConfirm] = useState<{ id: string; action: string } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ scope: mine ? 'mine' : 'marketplace', q: query, status, variety, sort, page: String(page) })
    async function load() {
      setLoading(true); setError(''); setRows([])
      try { const result = await harvestFetch<Result>('/api/harvest?' + params, { signal: controller.signal }); if (!controller.signal.aborted) { setRows(result.data); setTotal(result.total) } }
      catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Daftar belum dapat dimuat.'); setTotal(0) } }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [mine, query, status, variety, sort, page, refresh])
  async function change(row: HarvestListing, action: string) {
    setBusy(row.id); setError(''); setMessage('')
    try {
      await harvestFetch(`/api/harvest/${row.id}`, jsonRequest(action === 'delete' ? 'DELETE' : 'PATCH', { action, updated_at: row.updated_at }))
      setMessage(action === 'delete' ? 'Penawaran berhasil dihapus.' : 'Status panen berhasil diperbarui.'); setConfirm(null); setPage(1); setRefresh(v => v + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Perubahan gagal.'); setConfirm(null) }
    finally { setBusy('') }
  }
  const active = rows.filter(row => row.status === 'published'), available = mine ? active : rows
  const stock = available.reduce((n, row) => n + Number(row.quantity_kg), 0)
  const value = available.reduce((n, row) => n + Number(row.quantity_kg) * Number(row.price_per_kg), 0)
  const locations = new Set(available.map(row => row.location)).size
  const stats = mine ? [
    { icon: Package, label: 'Stok aktif', value: kilograms(stock), hint: 'Penawaran tayang di halaman ini' },
    { icon: Wallet, label: 'Nilai penawaran aktif', value: rupiah(value), hint: 'Estimasi stok × harga; bukan pendapatan' },
    { icon: ClipboardList, label: 'Hasil penelusuran', value: `${total} penawaran`, hint: 'Sesuai filter yang dipilih' },
    { icon: Leaf, label: 'Menunggu moderasi', value: rows.filter(r => r.status === 'pending').length.toString(), hint: 'Pada halaman yang ditampilkan' },
  ] : [
    { icon: Package, label: 'Pasokan tersedia', value: kilograms(stock), hint: 'Total stok pada halaman ini' },
    { icon: Wallet, label: 'Rentang harga penawaran', value: available.length ? (new Set(available.map(r=>Number(r.price_per_kg))).size===1 ? rupiah(Number(available[0].price_per_kg)) : `${rupiah(Math.min(...available.map(r => Number(r.price_per_kg))))}–${rupiah(Math.max(...available.map(r => Number(r.price_per_kg))))}`) : 'Belum tersedia', hint: 'Harga per kg dari penjual' },
    { icon: MapPin, label: 'Lokasi panen', value: `${locations} lokasi`, hint: 'Pada penawaran yang ditampilkan' },
    { icon: ClipboardList, label: 'Penawaran ditemukan', value: total.toString(), hint: 'Telah melalui moderasi Admin' },
  ]
  return <div className="pm-module">
    <HarvestNav mine={mine} />
    <header className="pm-hero flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><span className="pm-eyebrow">Bursa informasi hasil panen</span><h1>{mine ? 'Kelola Panen Saya' : 'Marketplace Panen'}</h1><p>{mine ? 'Atur stok dan harga penawaranmu. Simpan draf, pantau moderasi, dan tandai panen yang sudah habis.' : 'Temukan hasil panen bawang merah, bandingkan penawaran, dan terhubung langsung dengan penjual.'}</p></div><Link href="/dashboard/panen/baru" className="sim-button-primary shrink-0"><Plus className="h-4 w-4" />Buat penawaran baru</Link></header>
    <div className="pm-stats">{stats.map(({ icon: Icon, label, value, hint }) => <div className="pm-stat" key={label}><div className="pm-stat-icon"><Icon className="h-5 w-5" /></div><p className="pm-stat-label">{label}</p><p className="pm-stat-value">{loading ? '—' : value}</p><p className="pm-stat-hint">{hint}</p></div>)}</div>
    {!mine && <section className="pm-contact-banner flex items-center justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Dari petani, untuk pembeli</span><h2 className="mt-3 text-xl font-bold sm:text-2xl">Hasil panenmu bertemu peluang baru.</h2><p>Lihat informasi stok, varietas, dan lokasi. Hubungi penjual untuk memastikan detail panennya.</p></div><Leaf className="hidden h-20 w-20 shrink-0 opacity-25 sm:block" aria-hidden="true" /></section>}
    <section className="pm-panel space-y-4" aria-label="Filter penawaran panen">
      {mine && <div className="pm-tabs" role="group" aria-label="Status penawaran">{[['','Semua penawaran'],...Object.entries(STATUS_LABELS)].map(([value,label]) => <button key={value} aria-pressed={status === value} onClick={() => {setStatus(value);setPage(1)}}>{label}</button>)}</div>}
      <div className="flex flex-wrap items-end gap-3"><form className="min-w-48 flex-1" onSubmit={e => {e.preventDefault();setQuery(draftQuery);setPage(1)}}><label className="pm-field">Cari panen<div className="flex gap-2"><input className="pm-input" type="search" value={draftQuery} maxLength={100} onChange={e => setDraftQuery(e.target.value)} placeholder="Judul, varietas, atau lokasi…" /><button className="sim-button-primary" aria-label="Cari penawaran"><Search className="h-4 w-4" /></button></div></label></form><label className="pm-field">Varietas<select className="pm-input" value={variety} onChange={e => {setVariety(e.target.value);setPage(1)}}><option value="">Semua varietas</option>{VARIETIES.map(v => <option key={v}>{v}</option>)}</select></label><label className="pm-field">Urutkan<select className="pm-input" value={sort} onChange={e => {setSort(e.target.value);setPage(1)}}><option value="newest">Terbaru</option><option value="lowest">Harga terendah</option><option value="highest">Harga tertinggi</option></select></label><button className="sim-button-secondary" onClick={() => setRefresh(v => v + 1)} disabled={loading} aria-label="Segarkan penawaran"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /></button></div>
      {(query || variety || status) && <button className="text-xs font-bold text-[var(--theme-green)]" onClick={() => {setQuery('');setDraftQuery('');setVariety('');setStatus('');setPage(1)}}>Reset filter</button>}
    </section>
    {message && <p className="pm-soft text-sm" role="status">{message}</p>}
    {error && <div className="pm-panel"><p role="alert" className="text-sm">{error}</p><button className="sim-button-secondary mt-3" onClick={() => setRefresh(v => v + 1)}>Coba lagi</button></div>}
    <div className="flex items-center justify-between"><h2 className="text-lg font-bold">{mine ? 'Penawaran milik saya' : 'Koleksi panen terkini'}</h2><span className="pm-badge">{loading ? 'Memuat…' : `${total} penawaran`}</span></div>
    {loading ? <div className="pm-harvest-grid" aria-label="Memuat penawaran" aria-busy="true">{[1,2,3].map(n => <div key={n} className="pm-panel h-72 animate-pulse bg-[var(--theme-green-soft)]" />)}</div> : !error && !rows.length ? <HarvestEmpty mine={mine} filtered={Boolean(query || variety || status)} /> : <div className={'pm-harvest-grid ' + (mine ? 'pm-managed-grid' : '')}>{rows.map(row => <article className="pm-harvest-card" key={row.id}>
      <Link href={`/dashboard/panen/${row.id}`} className="pm-card-photo" aria-label={'Lihat detail ' + row.title}><HarvestPhoto row={row} /><HarvestBadge status={row.status} /></Link>
      <div className="pm-card-body"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-green)]">{row.variety || 'Bawang merah'}</p><h3 className="pm-card-title"><Link href={`/dashboard/panen/${row.id}`}>{row.title}</Link></h3><HarvestLocation value={row.location} /><p className="text-xs font-semibold">Stok {kilograms(row.quantity_kg)}</p><div className="flex flex-wrap items-end justify-between gap-2"><p className="pm-card-price">{rupiah(row.price_per_kg)}<span className="ml-1 text-xs font-medium text-[var(--theme-muted)]">/kg</span></p><Link href={`/dashboard/panen/${row.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-[var(--theme-green)]">Detail<ArrowRight className="h-4 w-4" /></Link></div>
      {mine && <><p className="text-[11px] leading-5 text-[var(--theme-muted)]">Estimasi nilai stok: {rupiah(Number(row.quantity_kg) * Number(row.price_per_kg))}</p>{row.moderation_note && <p className="pm-soft text-xs"><strong>Catatan Admin: </strong>{row.moderation_note}</p>}<div className="flex flex-wrap gap-2"><Link href={`/dashboard/panen/${row.id}/edit`} className="sim-button-secondary text-xs">{row.status === 'draft' ? 'Lengkapi & ajukan' : 'Edit penawaran'}</Link>{row.status === 'published' && <button className="sim-button-primary text-xs" disabled={Boolean(busy)} onClick={() => setConfirm({id:row.id,action:'sold'})}>Tandai terjual</button>}{row.status === 'pending' && <button className="sim-button-secondary text-xs" disabled={Boolean(busy)} onClick={() => setConfirm({id:row.id,action:'withdraw'})}>Tarik pengajuan</button>}{['draft','hidden','sold'].includes(row.status) && <button className="text-xs font-semibold text-[var(--theme-rose)]" disabled={Boolean(busy)} onClick={() => setConfirm({id:row.id,action:'delete'})}>Hapus</button>}</div>
      {confirm?.id === row.id && <div className="pm-inline-confirm"><p>{confirm.action === 'delete' ? 'Hapus penawaran ini? Data yang dihapus tidak dapat dikembalikan.' : confirm.action === 'sold' ? 'Stok sudah habis? Penawaran akan dikeluarkan dari marketplace.' : 'Tarik pengajuan dan simpan kembali sebagai draf?'}</p><div className="mt-3 flex gap-2"><button disabled={Boolean(busy)} className="sim-button-primary text-xs" onClick={() => void change(row,confirm.action)}>{busy ? 'Memproses…' : 'Ya, lanjutkan'}</button><button disabled={Boolean(busy)} className="sim-button-secondary text-xs" onClick={() => setConfirm(null)}>Batal</button></div></div>}</>}
      </div></article>)}</div>}
    {total > 12 && <nav className="flex items-center justify-center gap-4" aria-label="Halaman penawaran"><button className="sim-button-secondary" disabled={page === 1 || loading} onClick={() => setPage(v => v - 1)} aria-label="Halaman sebelumnya"><ChevronLeft className="h-4 w-4" /></button><p className="text-xs">Halaman {page} dari {Math.ceil(total/12)}</p><button className="sim-button-secondary" disabled={page >= Math.ceil(total/12) || loading} onClick={() => setPage(v => v + 1)} aria-label="Halaman berikutnya"><ChevronRight className="h-4 w-4" /></button></nav>}
    <HarvestNotice />
  </div>
}
