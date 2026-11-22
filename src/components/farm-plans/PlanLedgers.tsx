'use client'
import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { COST_CATEGORIES, MAX_ITEMS, costAmount, quantityForArea, saleAmount, dateIsValid, decimal, money, type CostCategory, type CostItem, type SaleItem } from '@/lib/farm-plans/shared'

export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(new Date())
const blankCost = () => ({ category: 'seed' as CostCategory, label: '', quantity: '1', unit: 'paket', unit_price: '', date: today() })
const blankSale = () => ({ date: today(), method: 'per_kg' as 'per_kg' | 'tebasan', quantity_kg: '', price_per_kg: '', total_price: '', note: '' })

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false)
  return confirm ? <span className="flex flex-wrap items-center gap-2"><button type="button" className="farm-text-link" aria-label={`Konfirmasi hapus ${label}`} onClick={onRemove}>Ya, hapus</button><button type="button" className="farm-text-link" onClick={() => setConfirm(false)}>Batal</button></span>
    : <button type="button" className="farm-text-link farm-danger" aria-label={`Hapus ${label}`} onClick={() => setConfirm(true)}>Hapus</button>
}

export function CostLedger({ kind, rows, areaM2, onChange, onPending }: { kind: 'budget' | 'expense'; rows: CostItem[]; areaM2?: number | null; onChange: (items: CostItem[]) => void; onPending: (pending: boolean) => void }) {
  const [draft, setDraft] = useState(blankCost), [editId, setEditId] = useState<string | null>(null), [error, setError] = useState('')
  const [basis, setBasis] = useState('total')
  const actual = kind === 'expense', prefix = actual ? 'expense' : 'budget'
  function change(key: keyof typeof draft, value: string) { const next = { ...draft, [key]: value }; setDraft(next); onPending(Boolean(editId || next.label.trim() || next.unit_price)); setError('') }
  function reset() { setDraft(blankCost()); setBasis('total'); setEditId(null); setError(''); onPending(false) }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (basis === 'per_1000' && (!areaM2 || actual)) { setError('Isi luas lahan terlebih dahulu untuk menghitung kebutuhan per 1.000 m².'); return }
    const enteredQuantity = Number(draft.quantity)
    if (!Number.isFinite(enteredQuantity) || enteredQuantity <= 0 || enteredQuantity > 1_000_000 || Math.abs(enteredQuantity * 100 - Math.round(enteredQuantity * 100)) > 0.00001) { setError('Jumlah kebutuhan harus positif dengan maksimal dua desimal.'); return }
    const quantity = basis === 'per_1000' ? quantityForArea(enteredQuantity, areaM2!) : enteredQuantity, price = Number(draft.unit_price)
    if (!draft.label.trim() || !draft.unit.trim() || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001 || !Number.isInteger(price) || price <= 0 || price > 100_000_000_000 || Math.round(quantity * price) > 1_000_000_000_000 || actual && !dateIsValid(draft.date)) { setError('Isi nama, jumlah positif maksimal dua desimal, satuan, harga rupiah bulat, dan tanggal yang valid.'); return }
    if (!editId && rows.length >= MAX_ITEMS) { setError('Maksimal 80 rincian. Gabungkan biaya sejenis bila diperlukan.'); return }
    const row: CostItem = { id: editId || crypto.randomUUID(), category: draft.category, label: draft.label.trim(), unit: draft.unit.trim(), quantity, unit_price: price, date: actual ? draft.date : null }
    onChange(editId ? rows.map(x => x.id === editId ? row : x) : [...rows, row])
    reset()
  }
  function edit(row: CostItem) { setDraft({ category: row.category, label: row.label, unit: row.unit, quantity: String(row.quantity), unit_price: String(row.unit_price), date: row.date || today() }); setBasis('total'); setEditId(row.id); setError(''); onPending(true) }
  return <div>
    {rows.length ? <div className="farm-table-wrap"><table className="farm-table"><caption className="sr-only">{actual ? 'Rincian pengeluaran yang sudah terjadi' : 'Rincian rencana biaya satu musim'}</caption><thead><tr><th scope="col">Komponen</th><th scope="col">Jumlah × harga</th><th scope="col">Total</th><th scope="col">Tindakan</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <th scope="row"><span className="block font-semibold">{row.label}</span><span className="farm-help">{COST_CATEGORIES[row.category]}{row.date ? ` · ${row.date}` : ''}</span></th>
      <td>{decimal(row.quantity)} {row.unit}<br /><span className="farm-help">× {money(row.unit_price)}</span></td><td className="font-semibold">{money(costAmount(row))}</td>
      <td><div className="flex flex-wrap gap-3"><button type="button" className="farm-text-link" aria-label={`Ubah ${row.label}`} onClick={() => edit(row)}>Ubah</button><RemoveButton label={row.label} onRemove={() => { onChange(rows.filter(x => x.id !== row.id)); if (editId === row.id) reset() }} /></div></td>
    </tr>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>Total {actual ? 'pengeluaran tercatat' : 'anggaran'}</th><td colSpan={2}>{money(rows.reduce((s, x) => s + costAmount(x), 0))}</td></tr></tfoot></table></div> : <p className="farm-empty">{actual ? 'Belum ada pengeluaran tercatat. Tambahkan biaya yang benar-benar sudah keluar.' : 'Belum ada anggaran. Isi total per kategori atau rincikan jumlah × harga satuan.'}</p>}
    <form onSubmit={save} className="farm-entry-form" aria-label={actual ? 'Tambah atau ubah pengeluaran' : 'Tambah atau ubah anggaran'}>
      <h3 className="font-semibold">{editId ? 'Ubah rincian' : actual ? 'Tambah pengeluaran' : 'Tambah rencana biaya'}</h3>
      <div className="farm-fields mt-4">
        {!actual && <label className="farm-field sm:col-span-2">Dasar jumlah kebutuhan<select className="farm-input" value={basis} onChange={e => setBasis(e.target.value)}><option value="total">Jumlah untuk seluruh lahan</option><option value="per_1000" disabled={!areaM2}>Kebutuhan per 1.000 m² — hitung sesuai luas lahan</option></select></label>}
        <label className="farm-field" htmlFor={`${prefix}-category`}>Kategori<select id={`${prefix}-category`} className="farm-input" value={draft.category} onChange={e => change('category', e.target.value)}>{Object.entries(COST_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="farm-field" htmlFor={`${prefix}-label`}>Nama biaya<input id={`${prefix}-label`} className="farm-input" required maxLength={120} value={draft.label} onChange={e => change('label', e.target.value)} placeholder="Misalnya: benih Tajuk" /></label>
        <label className="farm-field" htmlFor={`${prefix}-quantity`}>{basis === 'per_1000' ? 'Jumlah kebutuhan per 1.000 m²' : 'Jumlah'}<input id={`${prefix}-quantity`} className="farm-input" type="number" inputMode="decimal" min="0.01" max="1000000" step="0.01" required value={draft.quantity} onChange={e => change('quantity', e.target.value)} /></label>
        <label className="farm-field" htmlFor={`${prefix}-unit`}>Satuan<input id={`${prefix}-unit`} className="farm-input" required maxLength={30} value={draft.unit} onChange={e => change('unit', e.target.value)} placeholder="kg, hari, orang-hari, paket" /></label>
        <label className="farm-field" htmlFor={`${prefix}-price`}>Harga satuan (Rp)<input id={`${prefix}-price`} className="farm-input" type="number" inputMode="numeric" min="1" max="100000000000" step="1" required value={draft.unit_price} onChange={e => change('unit_price', e.target.value)} /></label>
        {actual && <label className="farm-field" htmlFor={`${prefix}-date`}>Tanggal pengeluaran<input id={`${prefix}-date`} className="farm-input" type="date" required value={draft.date} onChange={e => change('date', e.target.value)} /></label>}
      </div>
      {basis === 'per_1000' && areaM2 && <p className="farm-notice mt-3 text-xs leading-6">Jumlah untuk {decimal(areaM2)} m²: {decimal(quantityForArea(Number(draft.quantity || 0), areaM2))} {draft.unit}. Kebutuhan per 1.000 m² berasal dari isianmu dan dibulatkan dua desimal. Periksa kebutuhan nyata, terutama jika pembelian harus dalam kemasan utuh.</p>}
      <p className="farm-help mt-3">Untuk biaya total, isi jumlah 1 dan satuan paket. Anggaran adalah rencana; pengeluaran adalah realisasi biaya yang sama, sehingga tidak dihitung dua kali.</p>
      {error && <p role="alert" className="farm-alert mt-3">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" className="farm-button"><Plus className="h-4 w-4" aria-hidden="true" />{editId ? 'Terapkan perubahan rincian' : 'Tambahkan ke catatan'}</button><button type="button" className="farm-button" onClick={reset}><X className="h-4 w-4" aria-hidden="true" />{editId ? 'Batal ubah' : 'Kosongkan isian'}</button><span className="farm-help">Lanjutkan dengan Simpan seluruh perubahan.</span></div>
    </form>
  </div>
}

export function SalesLedger({ rows, actualYield, onChange, onPending }: { rows: SaleItem[]; actualYield: number | null; onChange: (items: SaleItem[]) => void; onPending: (pending: boolean) => void }) {
  const [draft, setDraft] = useState(blankSale), [editId, setEditId] = useState<string | null>(null), [error, setError] = useState('')
  function change(key: keyof typeof draft, value: string) { const next = { ...draft, [key]: value }; setDraft(next); onPending(Boolean(editId || next.quantity_kg || next.price_per_kg || next.total_price || next.note)); setError('') }
  function reset() { setDraft(blankSale()); setEditId(null); setError(''); onPending(false) }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = draft.quantity_kg === '' ? null : Number(draft.quantity_kg), price = Number(draft.price_per_kg), total = Number(draft.total_price)
    if (!dateIsValid(draft.date) || q !== null && (!Number.isFinite(q) || q <= 0 || q > 1_000_000 || Math.abs(q * 100 - Math.round(q * 100)) > 0.00001) || draft.method === 'per_kg' && (q === null || !Number.isInteger(price) || price <= 0 || price > 100_000_000) || draft.method === 'tebasan' && (!Number.isInteger(total) || total <= 0 || total > 100_000_000_000)) { setError('Isi tanggal, berat, dan harga yang valid. Penjualan tebasan boleh tidak menyertakan berat.'); return }
    if (!editId && rows.length >= MAX_ITEMS) { setError('Maksimal 80 catatan penjualan per musim.'); return }
    const row: SaleItem = { id: editId || crypto.randomUUID(), date: draft.date, method: draft.method, quantity_kg: q, price_per_kg: draft.method === 'per_kg' ? price : null, total_price: draft.method === 'tebasan' ? total : null, note: draft.note.trim() }
    const next = editId ? rows.map(x => x.id === editId ? row : x) : [...rows, row]
    if (actualYield !== null && next.reduce((s, x) => s + Math.round((x.quantity_kg || 0) * 100), 0) > Math.round(actualYield * 100)) { setError('Berat penjualan melebihi panen siap jual. Periksa penjualan atau perbarui jumlah hasil panen.'); return }
    onChange(next); reset()
  }
  return <div>
    {rows.length ? <div className="farm-table-wrap"><table className="farm-table"><caption className="sr-only">Penjualan panen yang sudah terjadi</caption><thead><tr><th scope="col">Penjualan</th><th scope="col">Berat & harga</th><th scope="col">Penerimaan</th><th scope="col">Tindakan</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
      <th scope="row"><span className="block font-semibold">{row.date} · {row.method === 'tebasan' ? 'Tebasan' : 'Per kg'}</span><span className="farm-help break-words">{row.note || 'Tanpa catatan tambahan'}</span></th>
      <td>{row.quantity_kg === null ? 'Berat tidak diketahui' : `${decimal(row.quantity_kg)} kg`}{row.method === 'per_kg' && <><br /><span className="farm-help">× {money(row.price_per_kg!)}/kg</span></>}</td><td className="font-semibold">{money(saleAmount(row))}</td>
      <td><div className="flex flex-wrap gap-3"><button type="button" className="farm-text-link" aria-label={`Ubah penjualan ${row.date}`} onClick={() => { setEditId(row.id); setError(''); onPending(true); setDraft({ date: row.date, method: row.method, quantity_kg: row.quantity_kg === null ? '' : String(row.quantity_kg), price_per_kg: row.price_per_kg === null ? '' : String(row.price_per_kg), total_price: row.total_price === null ? '' : String(row.total_price), note: row.note }) }}>Ubah</button><RemoveButton label={`penjualan ${row.date}`} onRemove={() => { onChange(rows.filter(x => x.id !== row.id)); if (editId === row.id) reset() }} /></div></td>
    </tr>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>Total penerimaan tercatat</th><td colSpan={2}>{money(rows.reduce((s, x) => s + saleAmount(x), 0))}</td></tr></tfoot></table></div> : <p className="farm-empty">Belum ada penjualan tercatat. Harga penawaran belum dianggap sebagai penjualan.</p>}
    <form onSubmit={save} className="farm-entry-form" aria-label="Tambah atau ubah penjualan">
      <h3 className="font-semibold">{editId ? 'Ubah penjualan' : 'Catat penjualan yang sudah terjadi'}</h3>
      <div className="farm-fields mt-4">
        <label className="farm-field">Tanggal penjualan<input type="date" className="farm-input" required value={draft.date} onChange={e => change('date', e.target.value)} /></label>
        <label className="farm-field">Cara penjualan<select className="farm-input" value={draft.method} onChange={e => change('method', e.target.value)}><option value="per_kg">Per kilogram</option><option value="tebasan">Tebasan / kesepakatan total</option></select></label>
        <label className="farm-field">Berat terjual (kg){draft.method === 'tebasan' && ' — opsional'}<input type="number" className="farm-input" inputMode="decimal" min="0.01" max="1000000" step="0.01" required={draft.method === 'per_kg'} value={draft.quantity_kg} onChange={e => change('quantity_kg', e.target.value)} /></label>
        {draft.method === 'per_kg' ? <label className="farm-field">Harga disepakati per kg (Rp)<input type="number" className="farm-input" inputMode="numeric" min="1" max="100000000" step="1" required value={draft.price_per_kg} onChange={e => change('price_per_kg', e.target.value)} /></label> : <label className="farm-field">Nilai kesepakatan total (Rp)<input type="number" className="farm-input" inputMode="numeric" min="1" max="100000000000" step="1" required value={draft.total_price} onChange={e => change('total_price', e.target.value)} /></label>}
        <label className="farm-field sm:col-span-2">Catatan — opsional<input className="farm-input" maxLength={300} value={draft.note} onChange={e => change('note', e.target.value)} placeholder="Misalnya: penjualan tahap pertama" /></label>
      </div>
      <p className="farm-help mt-3">Catat nilai penjualan yang disepakati. Aplikasi tidak memverifikasi pembayaran atau memproses transaksi. Tebasan tanpa berat membuat sisa stok belum dapat dihitung.</p>
      {error && <p role="alert" className="farm-alert mt-3">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" className="farm-button"><Check className="h-4 w-4" aria-hidden="true" />{editId ? 'Terapkan perubahan penjualan' : 'Tambahkan penjualan'}</button><button type="button" className="farm-button" onClick={reset}>{editId ? 'Batal ubah' : 'Kosongkan isian'}</button><span className="farm-help">Lanjutkan dengan Simpan seluruh perubahan.</span></div>
    </form>
  </div>
}
