/* eslint-disable @next/next/no-img-element -- Local file previews use temporary blob URLs. */
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, ClipboardList, ImagePlus, Leaf, Loader2, MapPin, Phone, Save, Send, Wallet, X } from 'lucide-react'
import { MAX_PHOTOS, MAX_PHOTO_BYTES, VARIETIES, kilograms, rupiah, validateHarvestInput, type HarvestInput, type HarvestListing } from '@/lib/harvest/shared'
import { HarvestBack, HarvestBadge, HarvestNotice, HarvestPhoto, harvestFetch, jsonRequest } from './HarvestUI'

const EMPTY = { title: '', description: '', variety: 'Tajuk', location: '', quantity_kg: '', price_per_kg: '', harvest_date: '', contact: '' }
type Fields = typeof EMPTY
type SelectedPhoto = { file: File; url: string }
export default function HarvestForm({ id }: { id?: string }) {
  const router = useRouter()
  const [fields, setFields] = useState<Fields>(EMPTY), [row, setRow] = useState<HarvestListing | null>(null)
  const rowRef = useRef<HarvestListing | null>(null), photosRef = useRef<SelectedPhoto[]>([])
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [loading, setLoading] = useState(Boolean(id)), [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState(''), [consent, setConsent] = useState(false), [retry,setRetry] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null), submitRef = useRef(false)
  function updateRow(value: HarvestListing) { rowRef.current = value; setRow(value) }
  function updatePhotos(value: SelectedPhoto[]) { photosRef.current = value; setPhotos(value) }
  useEffect(() => () => photosRef.current.forEach(p => URL.revokeObjectURL(p.url)), [])
  useEffect(() => {
    const controller = new AbortController()
    if (!id) return
    async function load() {
      setLoading(true);setError('')
      try {
        const result = await harvestFetch<{data: HarvestListing; user_id: string}>(`/api/harvest/${id}`, {signal:controller.signal})
        if (controller.signal.aborted) return
        if (result.data.seller_id !== result.user_id) throw new Error('Kamu hanya dapat menyunting penawaran milik sendiri.')
        updateRow(result.data)
        const d = result.data
        setFields({title:d.title,description:d.description,variety:d.variety || '',location:d.location,quantity_kg:String(d.quantity_kg),price_per_kg:String(d.price_per_kg),harvest_date:d.harvest_date || '',contact:d.contact})
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Penawaran tidak dapat dimuat.') }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load();return () => controller.abort()
  }, [id,retry])
  function change(name: keyof Fields, value: string) { setFields(v => ({...v,[name]:value}));setMessage('') }
  function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);event.target.value = ''
    if (photos.length + selected.length + (row?.image_paths.length || 0) > MAX_PHOTOS) { setError('Maksimal tiga foto panen.');return }
    if (selected.some(file => !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > MAX_PHOTO_BYTES || !file.size)) {setError('Gunakan JPG, PNG, atau WebP; maksimal 3 MB per foto.');return}
    setError('');updatePhotos([...photos,...selected.map(file => ({file,url:URL.createObjectURL(file)}))])
  }
  function removeSelected(index: number) { URL.revokeObjectURL(photos[index].url);updatePhotos(photos.filter((_,i) => i !== index)) }
  async function removeExisting(index: number) {
    if (!row || busy) return
    setBusy('Menghapus foto…');setError('')
    try {
      let current = rowRef.current!
      if (current.status !== 'draft') current = (await harvestFetch<{data:HarvestListing}>(`/api/harvest/${current.id}`,jsonRequest('PATCH',{action:'save',updated_at:current.updated_at}))).data
      updateRow(current)
      const result = await harvestFetch<{data:HarvestListing}>(`/api/harvest/${current.id}`,jsonRequest('PATCH',{action:'remove_photo',index,updated_at:current.updated_at}))
      updateRow(result.data)
    } catch(e) {setError(e instanceof Error ? e.message : 'Foto tidak dapat dihapus.')} finally {setBusy('')}
  }
  async function save(submit: boolean) {
    if (submitRef.current) return
    setError('');setMessage('')
    const input: HarvestInput = {...fields, quantity_kg:Number(fields.quantity_kg),price_per_kg:Number(fields.price_per_kg),harvest_date:fields.harvest_date || null,variety:fields.variety || null}
    const result = validateHarvestInput(input)
    if (!result.data) {setError(result.error!);return}
    if (submit && !(photos.length + (rowRef.current?.image_paths.length || 0))) {setError('Tambahkan sedikitnya satu foto panen sebelum mengajukan.');return}
    if (submit && !consent) {setError('Centang persetujuan agar kontak penjual dapat ditampilkan pada penawaran.');return}
    submitRef.current = true;setBusy('Menyimpan draf…')
    try {
      const existing = rowRef.current
      const saved = existing ? await harvestFetch<{data:HarvestListing}>(`/api/harvest/${existing.id}`,jsonRequest('PATCH',{action:'save',data:result.data,updated_at:existing.updated_at})) : await harvestFetch<{data:HarvestListing}>('/api/harvest',jsonRequest('POST',result.data))
      let current: HarvestListing = saved.data;updateRow(current)
      for (const photo of photos) {
        setBusy('Mengunggah ' + photo.file.name + '…')
        const uploaded = await harvestFetch<{data:HarvestListing}>(`/api/harvest/${current.id}/photos`,{method:'POST',headers:{'Content-Type':photo.file.type,'If-Unmodified-Since':current.updated_at},body:photo.file})
        current = uploaded.data;updateRow(current)
        URL.revokeObjectURL(photo.url);updatePhotos(photosRef.current.filter(p => p !== photo))
      }
      if (submit) {
        setBusy('Mengajukan moderasi…')
        const submitted = await harvestFetch<{data:HarvestListing}>(`/api/harvest/${current.id}`,jsonRequest('PATCH',{action:'submit',updated_at:current.updated_at}))
        updateRow(submitted.data);router.push('/dashboard/panen/saya');router.refresh()
      } else {setMessage('Draf dan foto berhasil disimpan. Kamu dapat melanjutkan pengajuan kapan saja.'); if (!id) router.replace(`/dashboard/panen/${current.id}/edit`)}
    } catch(e) {setError(e instanceof Error ? e.message : 'Penawaran belum tersimpan. Silakan coba lagi.')}
    finally {setBusy('');submitRef.current=false}
  }
  if (loading) return <div className="pm-panel flex items-center gap-3" role="status"><Loader2 className="h-5 w-5 animate-spin" />Memuat penawaran…</div>
  if (id && !row) return <div className="pm-module"><HarvestBack /><div className="pm-panel"><p role="alert">{error || 'Penawaran tidak dapat diakses.'}</p><button className="sim-button-secondary mt-4" onClick={() => setRetry(v => v+1)}>Coba lagi</button></div></div>
  const valuation = Number(fields.quantity_kg) * Number(fields.price_per_kg)
  return <div className="pm-module max-w-6xl"><HarvestBack />
    <header className="pm-hero"><span className="pm-eyebrow">Informasi penawaran panen</span><h1>{id || row ? 'Sunting Penawaran Panen' : 'Buat Penawaran Baru'}</h1><p>Isi detail komoditas, harga dan stok, lalu tambahkan foto serta kontak yang dapat dihubungi.</p>{row && <div className="mt-4"><HarvestBadge status={row.status} /></div>}</header>
    <ol className="grid grid-cols-3 gap-3 rounded-2xl bg-[var(--theme-green-soft)] p-4 text-xs font-bold">{['Detail komoditas','Harga & stok','Foto & kontak'].map((label,i) => <li key={label} className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--theme-surface)] text-[var(--theme-green)]">{i+1}</span>{label}</li>)}</ol>
    {row && row.status !== 'draft' && <p className="pm-soft text-sm leading-6">Menyimpan perubahan akan mengembalikan penawaran menjadi draf. Ajukan kembali agar Admin meninjau informasi yang baru.</p>}
    {row?.moderation_note && <p className="pm-soft text-sm"><strong>Catatan Admin: </strong>{row.moderation_note}</p>}
    <form onSubmit={e => {e.preventDefault();void save(true)}} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-6">
        <section className="pm-panel pm-form-section"><h2><Leaf />Data komoditas</h2><div className="grid gap-5 sm:grid-cols-2"><label className="pm-field sm:col-span-2">Judul penawaran<input className="pm-input" required minLength={3} maxLength={200} value={fields.title} onChange={e => change('title',e.target.value)} placeholder="Contoh: Bawang Merah Tajuk Kering Panen" /></label><label className="pm-field">Varietas<input className="pm-input" list="harvest-varieties" value={fields.variety} maxLength={100} onChange={e => change('variety',e.target.value)} /><datalist id="harvest-varieties">{VARIETIES.map(v => <option key={v}>{v}</option>)}</datalist></label><label className="pm-field">Tanggal panen (opsional)<input type="date" className="pm-input" value={fields.harvest_date} onChange={e => change('harvest_date',e.target.value)} /></label><label className="pm-field sm:col-span-2">Deskripsi panen<textarea rows={4} maxLength={3000} className="pm-input" value={fields.description} onChange={e => change('description',e.target.value)} placeholder="Jelaskan kondisi umbi, pengeringan, serta informasi yang perlu diketahui pembeli." /></label></div></section>
        <section className="pm-panel pm-form-section"><h2><Wallet />Volume & penetapan harga</h2><div className="grid gap-5 sm:grid-cols-2"><label className="pm-field">Stok tersedia (kg)<input type="number" className="pm-input" min="0.01" step="0.01" max="1000000000" required value={fields.quantity_kg} onChange={e => change('quantity_kg',e.target.value)} placeholder="Contoh: 1500" /></label><label className="pm-field">Harga penawaran (Rp/kg)<input type="number" className="pm-input" min="0.01" step="0.01" max="1000000000" required value={fields.price_per_kg} onChange={e => change('price_per_kg',e.target.value)} placeholder="Contoh: 18500" /></label></div><div className="pm-soft mt-5"><p className="pm-eyebrow">Estimasi nilai penawaran</p><p className="mt-3 text-2xl font-bold text-[var(--theme-green)]">{Number.isFinite(valuation) ? rupiah(valuation) : '—'}</p><p className="mt-2 text-xs text-[var(--theme-muted)]">Stok × harga yang kamu isi. Bukan nilai penjualan yang sudah terjadi.</p></div></section>
        <section className="pm-panel pm-form-section"><h2><MapPin />Lokasi panen / titik muat</h2><label className="pm-field">Desa, kecamatan, dan kabupaten<input required minLength={3} maxLength={300} className="pm-input" value={fields.location} onChange={e => change('location',e.target.value)} placeholder="Contoh: Rejoso, Kabupaten Nganjuk, Jawa Timur" /></label><p className="mt-3 text-xs leading-6 text-[var(--theme-muted)]">Gunakan lokasi yang membantu pembeli mengenali asal panen. Detail pertemuan dapat disepakati langsung.</p></section>
        <section className="pm-panel pm-form-section"><h2><Camera />Foto panen asli</h2><p className="mb-5 text-xs leading-6 text-[var(--theme-muted)]">Maksimal 3 foto, masing-masing 3 MB. Format JPG, PNG, atau WebP. Sedikitnya satu foto diperlukan untuk pengajuan.</p><div className="grid grid-cols-3 gap-3">{row?.image_paths.map((path,index) => <div key={path} className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--theme-green-soft)]"><HarvestPhoto row={row} index={index} className="h-full w-full object-cover" /><button type="button" className="absolute right-1 top-1 flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full bg-[var(--theme-surface)]" onClick={() => void removeExisting(index)} aria-label={`Hapus foto tersimpan ${index+1}`}><X className="h-4 w-4" /></button></div>)}{photos.map((photo,index) => <div key={photo.url} className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--theme-green-soft)]"><img src={photo.url} alt={'Pratinjau '+photo.file.name} className="h-full w-full object-cover" /><button type="button" className="absolute right-1 top-1 flex h-8 w-8 min-h-8 min-w-8 items-center justify-center rounded-full bg-[var(--theme-surface)]" aria-label={`Batal unggah ${photo.file.name}`} onClick={() => removeSelected(index)}><X className="h-4 w-4" /></button></div>)}{photos.length + (row?.image_paths.length || 0) < 3 && <button type="button" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--theme-line)] bg-[var(--theme-green-soft)] text-xs font-bold text-[var(--theme-green)]" onClick={() => fileRef.current?.click()}><ImagePlus className="h-7 w-7" />Tambah foto</button>}</div><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Pilih foto panen" onChange={selectFiles} /></section>
        <section className="pm-panel pm-form-section"><h2><Phone />Kontak penjual</h2><label className="pm-field">Nomor WhatsApp<input type="tel" inputMode="tel" required className="pm-input" value={fields.contact} maxLength={25} onChange={e => change('contact',e.target.value)} placeholder="08xxxxxxxxxx atau +628xxxxxxxxxx" /></label><label className="mt-5 flex items-start gap-3 text-xs leading-6"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-emerald-700" /><span>Saya mengizinkan kontak ini ditampilkan kepada pengguna SIMANTRI saat penawaran dipublikasikan, agar calon pembeli dapat menghubungi saya.</span></label></section>
        <div aria-live="polite">{error && <p role="alert" className="pm-soft text-sm">{error}</p>}{message && <p role="status" className="pm-soft text-sm">{message}</p>}</div>
        <div className="sticky bottom-20 z-20 flex flex-wrap gap-3 rounded-2xl border border-[var(--theme-line)] bg-[var(--theme-surface)] p-4 lg:bottom-4"><button type="button" className="sim-button-secondary flex-1" disabled={Boolean(busy)} onClick={() => void save(false)}><Save className="h-4 w-4" />Simpan draf</button><button type="submit" className="sim-button-primary flex-1" disabled={Boolean(busy)}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy || 'Ajukan moderasi'}</button></div>
      </fieldset>
      <aside className="space-y-5 xl:sticky xl:top-28"><section className="pm-panel"><ClipboardList className="h-6 w-6 text-[var(--theme-green)]" /><h2 className="mt-4 text-lg font-bold">Ringkasan penawaran</h2><p className="mt-3 text-sm font-semibold">{fields.title || 'Judul panenmu'}</p><p className="mt-3 text-xs text-[var(--theme-muted)]">{fields.location || 'Lokasi belum diisi'}</p><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-2"><dt>Stok</dt><dd className="font-bold">{kilograms(Number(fields.quantity_kg) || 0)}</dd></div><div className="flex justify-between gap-2"><dt>Harga / kg</dt><dd className="font-bold">{rupiah(Number(fields.price_per_kg) || 0)}</dd></div><div className="flex justify-between gap-2"><dt>Foto</dt><dd>{photos.length+(row?.image_paths.length || 0)} / 3</dd></div></dl><p className="mt-5 flex items-start gap-2 text-xs leading-6 text-[var(--theme-muted)]"><Check className="mt-1 h-4 w-4 shrink-0 text-[var(--theme-green)]" />Admin meninjau kelengkapan penawaran sebelum tampil di marketplace.</p></section><HarvestNotice /></aside>
    </form>
  </div>
}
