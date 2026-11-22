'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Copy, Loader2, Save, Sprout, Trash2 } from 'lucide-react'
import { calculatePlan, decimal, emptyPlan, money, validateFarmPlan, type FarmPlan, type FarmPlanInput, type PlanMode } from '@/lib/farm-plans/shared'
import { harvestFetch, jsonRequest } from '@/components/harvest/HarvestUI'
import PlanSummary from './PlanSummary'
import { CostLedger, SalesLedger } from './PlanLedgers'

function inputOnly(plan: FarmPlan): FarmPlanInput {
  return Object.fromEntries(Object.keys(emptyPlan()).map(key => [key, plan[key as keyof FarmPlanInput]])) as unknown as FarmPlanInput
}
const readNumber = (value: string) => value === '' ? null : Number(value)

export default function PlanEditor({ initial, mode = 'planning' }: { initial?: FarmPlan; mode?: PlanMode }) {
  const router = useRouter()
  const [plan, setPlan] = useState<FarmPlanInput>(() => initial ? inputOnly(initial) : emptyPlan(mode))
  const [saved, setSaved] = useState<FarmPlan | null>(initial || null)
  const [busy, setBusy] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [tab, setTab] = useState('details')
  const [pending, setPending] = useState({ budget: false, expenses: false, sales: false })
  const saving = useRef(false), allowLeave = useRef(false), errorRef = useRef<HTMLParagraphElement>(null), deleteRef = useRef<HTMLDialogElement>(null)
  const dirty = Object.values(pending).some(Boolean) || (saved ? JSON.stringify(plan) !== JSON.stringify(inputOnly(saved)) : JSON.stringify(plan) !== JSON.stringify(emptyPlan(mode)))
  const totals = calculatePlan(plan)
  useEffect(() => {
    if (!dirty) return
    function beforeUnload(event: BeforeUnloadEvent) { if (!allowLeave.current) event.preventDefault() }
    function guardLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return
      const destination = new URL(link.href, window.location.href)
      if (destination.origin === location.origin && destination.pathname === location.pathname && destination.search === location.search) return
      if (!window.confirm('Ada perubahan rencana yang belum disimpan. Tinggalkan halaman dan abaikan perubahan?')) { event.preventDefault(); event.stopPropagation() }
      else allowLeave.current = true
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', guardLink, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', guardLink, true) }
  }, [dirty])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])
  function change<K extends keyof FarmPlanInput>(key: K, value: FarmPlanInput[K]) {
    setPlan(p => ({ ...p, [key]: value })); setMessage(''); setError('')
  }
  async function save(event?: React.FormEvent) {
    event?.preventDefault()
    if (saving.current) return
    setError(''); setMessage('')
    const pendingPart = Object.entries(pending).find(([, value]) => value)?.[0]
    if (pendingPart) { setTab(pendingPart); setError('Ada rincian yang masih diisi. Tekan Tambahkan/Terapkan pada rincian itu atau Kosongkan isian sebelum menyimpan seluruh perubahan.'); return }
    const checked = validateFarmPlan(plan)
    if (!checked.data) { setError(checked.error!); return }
    saving.current = true; setBusy('Menyimpan…')
    try {
      const result = await harvestFetch<{ data: FarmPlan }>(saved ? `/api/farm-plans/${saved.id}` : '/api/farm-plans', jsonRequest(saved ? 'PATCH' : 'POST', saved ? { version: saved.version, data: checked.data } : checked.data))
      setSaved(result.data); setPlan(inputOnly(result.data)); setMessage('Seluruh perubahan tersimpan di akunmu.')
      if (!saved) router.replace(`/dashboard/rencana/${result.data.id}`)
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Rencana belum tersimpan.') }
    finally { saving.current = false; setBusy('') }
  }
  async function copySeason() {
    if (!saved || saving.current) return
    saving.current = true; setBusy('Menyalin rencana…'); setError('')
    try {
      const next: FarmPlanInput = { ...inputOnly(saved), mode: 'planning', status: 'active', name: `${saved.name.slice(0, 120)} — musim baru`, planting_date: null, harvest_date: null, actual_yield_kg: null, costs_confirmed: false, expense_items: [], sales: [] }
      if (!next.area_m2) { setError('Lengkapi dan simpan luas lahan sebelum menyalin ke rencana musim baru.'); return }
      next.budget_items = (next.budget_items.length ? next.budget_items : saved.expense_items).map(item => ({ ...item, id: crypto.randomUUID(), date: null }))
      const result = await harvestFetch<{ data: FarmPlan }>('/api/farm-plans', jsonRequest('POST', next))
      router.push(`/dashboard/rencana/${result.data.id}`); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Rencana belum dapat disalin.') }
    finally { saving.current = false; setBusy('') }
  }
  async function remove() {
    if (!saved || saving.current) return
    deleteRef.current?.close(); saving.current = true; setBusy('Menghapus…'); setError('')
    try {
      await harvestFetch(`/api/farm-plans/${saved.id}`, jsonRequest('DELETE', { version: saved.version }))
      router.push('/dashboard/rencana'); router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : 'Rencana belum dapat dihapus.') }
    finally { saving.current = false; setBusy('') }
  }
  const canOffer = saved && !dirty && saved.actual_yield_kg !== null && saved.actual_yield_kg > 0 && totals.remainingKg !== null && totals.remainingKg > 0 && saved.status !== 'completed'
  const tabs = [{ id: 'details', label: 'Lahan & target' }, { id: 'budget', label: 'Rencana biaya' }, { id: 'expenses', label: 'Pengeluaran' }, { id: 'sales', label: 'Penjualan & hasil' }]
  return <div className="farm-page">
    <Link href="/dashboard/rencana" className="farm-text-link w-fit"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Semua rencana usaha tani</Link>
    <section className="farm-intro">
      <p className="farm-eyebrow">{plan.mode === 'planning' ? 'Mulai dari lahan dan kebutuhan modal' : 'Mulai dari panen yang siap dijual'}</p>
      <h1>{saved ? plan.name || 'Catatan usaha tani' : 'Buat Rencana Usaha Tani'}</h1>
      <p>{plan.mode === 'planning' ? 'Rencanakan satu musim, lalu perbarui dengan biaya dan hasil panen yang sebenarnya.' : 'Hitung biaya panenmu dan bandingkan harga penawaran sebelum menjual.'}</p>
    </section>
    <div className="farm-workspace">
      <div className="min-w-0">
        <div className="farm-section-nav" role="group" aria-label="Bagian catatan usaha"><div className="flex flex-wrap gap-2">{tabs.map(item => <button type="button" key={item.id} onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className="farm-button">{item.label}</button>)}</div></div>
        <fieldset disabled={Boolean(busy)} className="min-w-0 space-y-5">
          <legend className="sr-only">Rincian rencana dan hasil usaha tani</legend>
          <section hidden={tab !== 'details'} className="farm-panel" aria-labelledby="farm-details-title">
            <h2 id="farm-details-title" className="farm-section-title">1. Lahan dan target satu musim</h2>
            <p className="farm-help mt-2">Perkiraan diisi dari pengalaman atau rencana petani. Tidak ada angka produktivitas yang diisi otomatis.</p>
            <form id="farm-plan-form" onSubmit={save} className="mt-6 space-y-5">
              <div className="farm-fields">
                <label className="farm-field sm:col-span-2">Nama rencana<input className="farm-input" minLength={3} maxLength={150} required value={plan.name} onChange={e => change('name', e.target.value)} placeholder="Misalnya: Panen Tajuk Lahan Rejoso" /></label>
                <label className="farm-field">Lokasi lahan — opsional<input className="farm-input" maxLength={200} value={plan.location} onChange={e => change('location', e.target.value)} placeholder="Desa / kecamatan" /></label>
                <label className="farm-field">Varietas — opsional<input className="farm-input" maxLength={100} value={plan.variety} onChange={e => change('variety', e.target.value)} /></label>
                <label className="farm-field">Luas lahan (m²){plan.mode === 'selling' && ' — opsional'}<input className="farm-input" type="number" min="0.01" max="10000000" step="0.01" inputMode="decimal" required={plan.mode === 'planning'} value={plan.area_m2 ?? ''} onChange={e => change('area_m2', readNumber(e.target.value))} /><span className="farm-help">{plan.area_m2 ? `Setara ${decimal(plan.area_m2 / 10000)} hektare. 1 ha = 10.000 m².` : 'Gunakan luas aktual lahan yang direncanakan.'}</span></label>
                <label className="farm-field">Tanggal tanam — opsional<input className="farm-input" type="date" value={plan.planting_date || ''} onChange={e => change('planting_date', e.target.value || null)} /></label>
                {plan.mode === 'planning' && <label className="farm-field">Perkiraan panen siap jual (kg)<input className="farm-input" type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={plan.expected_yield_kg ?? ''} onChange={e => change('expected_yield_kg', readNumber(e.target.value))} /><span className="farm-help">Boleh dilengkapi nanti. Gunakan berat yang diperkirakan dapat dijual.</span></label>}
                <label className="farm-field">Hasil panen siap jual aktual (kg){plan.mode === 'planning' && ' — isi saat panen'}<input className="farm-input" type="number" min="0" max="1000000" step="0.01" inputMode="decimal" required={plan.mode === 'selling'} value={plan.actual_yield_kg ?? ''} onChange={e => change('actual_yield_kg', readNumber(e.target.value))} /><span className="farm-help">Kosong berarti belum diketahui. Isi 0 jika tidak ada hasil yang dapat dijual.</span></label>
                <label className="farm-field">Tanggal panen — opsional<input className="farm-input" type="date" min={plan.planting_date || undefined} value={plan.harvest_date || ''} onChange={e => change('harvest_date', e.target.value || null)} /></label>
                <label className="farm-field">Rencana cara penjualan<select className="farm-input" value={plan.sale_method} onChange={e => change('sale_method', e.target.value as FarmPlanInput['sale_method'])}><option value="per_kg">Per kilogram</option><option value="tebasan">Tebasan / nilai total</option></select></label>
                {plan.sale_method === 'per_kg' ? <label className="farm-field">Perkiraan harga jual per kg (Rp)<input className="farm-input" type="number" min="1" max="100000000" step="1" inputMode="numeric" value={plan.expected_price_per_kg ?? ''} onChange={e => change('expected_price_per_kg', readNumber(e.target.value))} /><span className="farm-help">Harga pilihanmu, belum dianggap sebagai penjualan.</span></label> : <label className="farm-field">Perkiraan nilai tebasan seluruh panen (Rp)<input className="farm-input" type="number" min="1" max="100000000000" step="1" inputMode="numeric" value={plan.expected_total_sale ?? ''} onChange={e => change('expected_total_sale', readNumber(e.target.value))} /><span className="farm-help">Nilai total satu musim, bukan harga per kilogram.</span></label>}
              </div>
              <button type="button" className="farm-button" onClick={() => setTab(plan.mode === 'selling' ? 'expenses' : 'budget')}>Lanjut ke {plan.mode === 'selling' ? 'pengeluaran' : 'rencana biaya'}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
            </form>
          </section>
          <section hidden={tab !== 'budget'} className="farm-panel" aria-labelledby="farm-budget-title">
            <h2 id="farm-budget-title" className="farm-section-title">2. Rencana biaya</h2><p className="farm-help mb-5 mt-2">Susun kebutuhan benih, pupuk, tenaga kerja, sampai penjualan untuk satu musim. Kamu bisa mengisi kebutuhan per 1.000 m² untuk dihitung sesuai luas lahan. Biaya sewa dan alat diisi sesuai alokasi musim tersebut.</p>
            <CostLedger kind="budget" rows={plan.budget_items} areaM2={plan.area_m2} onChange={items => change('budget_items', items)} onPending={value => setPending(p => ({ ...p, budget: value }))} />
            <p className="farm-help mt-4">Anggaran tersimpan memakai jumlah total lahan. Jika luas lahan diubah kemudian, tinjau ulang jumlah tiap rincian; anggaran lama tidak diubah otomatis.</p>
          </section>
          <section hidden={tab !== 'expenses'} className="farm-panel" aria-labelledby="farm-expenses-title">
            <h2 id="farm-expenses-title" className="farm-section-title">3. Pengeluaran yang sudah terjadi</h2><p className="farm-help mb-5 mt-2">Catat biaya sebenarnya. Gunakan kategori yang sama dengan anggaran agar sisa biaya dihitung dengan tepat. Jangan masukkan lagi rincian yang sudah tercakup dalam biaya total.</p>
            <CostLedger kind="expense" rows={plan.expense_items} onChange={items => { setPlan(p => ({ ...p, expense_items: items, costs_confirmed: false, status: 'active' })); setMessage(''); setError('') }} onPending={value => setPending(p => ({ ...p, expenses: value }))} />
            <label className="farm-check mt-5"><input type="checkbox" checked={plan.costs_confirmed} onChange={e => { setPlan(p => ({ ...p, costs_confirmed: e.target.checked, status: e.target.checked ? p.status : 'active' })); setMessage(''); setError('') }} /><span>Saya sudah mencatat seluruh biaya untuk musim ini, termasuk memastikan jika memang tidak ada biaya.<span className="farm-help mt-1 block">Jika dicentang, perhitungan memakai pengeluaran tercatat tanpa menambahkan sisa anggaran.</span></span></label>
            <details className="mt-6"><summary className="farm-text-link cursor-pointer">Lihat perbandingan anggaran dan pengeluaran</summary><div className="farm-table-wrap mt-4"><table className="farm-table"><caption className="sr-only">Perbandingan biaya per kategori</caption><thead><tr><th>Kategori</th><th>Anggaran</th><th>Tercatat</th><th>Sisa / kelebihan</th></tr></thead><tbody>{totals.categories.filter(c => c.planned || c.actual).map(c => <tr key={c.key}><th scope="row">{c.label}</th><td>{money(c.planned)}</td><td>{money(c.actual)}</td><td>{c.over ? `Melebihi ${money(c.over)}` : `Sisa ${money(c.remaining)}`}</td></tr>)}</tbody></table></div></details>
          </section>
          <section hidden={tab !== 'sales'} className="farm-panel" aria-labelledby="farm-sales-title">
            <h2 id="farm-sales-title" className="farm-section-title">4. Penjualan dan hasil usaha</h2><p className="farm-help mb-5 mt-2">Penjualan boleh dicatat bertahap. Angka dari penawaran marketplace tidak otomatis dianggap sudah terjual.</p>
            <SalesLedger rows={plan.sales} actualYield={plan.actual_yield_kg} onChange={items => { change('sales', items) }} onPending={value => setPending(p => ({ ...p, sales: value }))} />
            <div className="farm-running mt-6"><h3 className="font-semibold">Selisih penerimaan dan pengeluaran tercatat</h3><p className="mt-2 text-2xl font-bold">{totals.cashDifference === null ? 'Biaya belum dicatat' : money(totals.cashDifference)}</p><p className="farm-help mt-2">{plan.status === 'completed' ? 'Hasil akhir mengikuti penjualan dan biaya yang kamu nyatakan lengkap.' : 'Ini selisih sementara. Panen yang belum terjual dan biaya yang belum dicatat dapat mengubah hasil akhir.'}</p></div>
            <label className="farm-check mt-5"><input type="checkbox" checked={plan.status === 'completed'} disabled={!plan.costs_confirmed || plan.actual_yield_kg === null} onChange={e => change('status', e.target.checked ? 'completed' : 'active')} /><span>Tandai musim selesai: seluruh penjualan dan biaya sudah dicatat.<span className="farm-help mt-1 block">Lengkapi hasil panen aktual serta konfirmasi seluruh biaya di bagian Pengeluaran terlebih dahulu. Sisa panen yang tidak dijual tidak dihitung sebagai penerimaan.</span></span></label>
          </section>
          {totals.scenarios.length > 0 && <section className="farm-panel"><h2 className="farm-section-title">Bagaimana jika harga berubah?</h2><p className="farm-help mt-2">Perbandingan harga pilihanmu ±20%, dengan biaya dan hasil panen tetap. Ini skenario perhitungan, bukan perkiraan harga PIHPS.</p><div className="farm-table-wrap mt-4"><table className="farm-table"><caption className="sr-only">Skenario perubahan harga untuk sisa panen</caption><thead><tr><th scope="col">Skenario</th><th scope="col">Harga / kg</th><th scope="col">Laba / rugi satu musim</th></tr></thead><tbody>{totals.scenarios.map(s => <tr key={s.factor}><th scope="row">{s.factor < 1 ? 'Harga turun 20%' : s.factor > 1 ? 'Harga naik 20%' : 'Harga pilihanmu'}</th><td>{money(s.price)}</td><td>{s.profit < 0 ? 'Rugi ' : s.profit > 0 ? 'Untung ' : 'Impas '}{money(Math.abs(s.profit))}</td></tr>)}</tbody></table></div></section>}
        </fieldset>
        <div className="mt-5 space-y-3" aria-live="polite">{error && <p ref={errorRef} tabIndex={-1} role="alert" className="farm-alert">{error} <button type="button" className="underline" onClick={() => { setTab('details'); document.getElementById('farm-plan-form')?.scrollIntoView({ block: 'center' }) }}>Periksa isian</button>{error.includes('Muat ulang') && <button type="button" className="ml-2 underline" onClick={() => window.location.reload()}>Muat ulang halaman</button>}</p>}{message && <p role="status" className="farm-notice flex items-center gap-2"><Check className="h-4 w-4" aria-hidden="true" />{message}</p>}</div>
        <div className="farm-savebar mt-5"><div className="min-w-0"><p className="text-sm font-semibold">{dirty ? 'Ada perubahan belum disimpan' : saved ? 'Catatan tersimpan' : 'Rencana baru'}</p><p className="farm-help mt-1">{saved ? 'Perubahan hanya tersimpan setelah tombol simpan ditekan.' : 'Lengkapi nama dan data awal, lalu simpan ke akunmu.'}</p></div><button type="button" onClick={() => void save()} disabled={Boolean(busy)} className="farm-button farm-button-primary">{busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{busy || 'Simpan seluruh perubahan'}</button></div>
        {saved && <section className="farm-panel mt-5"><h2 className="farm-section-title">Langkah berikutnya</h2><div className="mt-4 flex flex-wrap gap-3">{canOffer ? <Link href={`/dashboard/panen/baru?plan=${saved.id}`} className="farm-button farm-button-primary">Buat penawaran panen<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link> : <p className="farm-help">Untuk membuat penawaran, isi hasil panen aktual yang masih tersedia dan simpan perubahan terlebih dahulu.</p>}<button type="button" className="farm-button" disabled={Boolean(busy) || dirty} onClick={() => void copySeason()}><Copy className="h-4 w-4" aria-hidden="true" />Salin ke musim baru</button><button type="button" className="farm-button farm-danger" disabled={Boolean(busy)} onClick={() => deleteRef.current?.showModal()}><Trash2 className="h-4 w-4" aria-hidden="true" />Hapus rencana</button></div><p className="farm-help mt-3">Penawaran baru tetap berupa draf dan mengikuti moderasi. Salinan musim baru hanya membawa anggaran; pengeluaran serta penjualan lama tidak disalin.</p></section>}
      </div>
      <PlanSummary plan={plan} />
    </div>
    <dialog ref={deleteRef} className="farm-dialog" aria-labelledby="farm-delete-title"><h2 id="farm-delete-title" className="text-xl font-bold">Hapus rencana ini?</h2><p className="farm-help mt-3">Rencana beserta anggaran, pengeluaran, dan catatan penjualannya akan dihapus. Penawaran marketplace tidak ikut dihapus.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" autoFocus className="farm-button" onClick={() => deleteRef.current?.close()}>Batal</button><button type="button" className="farm-button farm-danger" onClick={() => void remove()}>Ya, hapus rencana</button></div></dialog>
    <p className="farm-help flex items-center gap-2"><Sprout className="h-4 w-4 shrink-0" aria-hidden="true" />Satu catatan untuk satu lahan atau kelompok panen dalam satu musim.</p>
  </div>
}
