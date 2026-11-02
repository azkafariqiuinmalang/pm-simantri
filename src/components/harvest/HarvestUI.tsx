/* eslint-disable @next/next/no-img-element -- Authenticated private images are served through the guarded photo API. */
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Leaf, MapPin, Package, ShoppingBasket } from 'lucide-react'
import { STATUS_LABELS, type HarvestListing, type HarvestStatus } from '@/lib/harvest/shared'

export function HarvestNav({ mine = false }: { mine?: boolean }) {
  return <nav className="pm-tabs w-fit" aria-label="Halaman panen"><Link href="/dashboard/panen" aria-current={!mine ? 'page' : undefined}>Marketplace Panen</Link><Link href="/dashboard/panen/saya" aria-current={mine ? 'page' : undefined}>Kelola Panen Saya</Link></nav>
}
export function HarvestBadge({ status }: { status: HarvestStatus }) { return <span className="pm-badge" data-status={status}><span aria-hidden="true">●</span>{STATUS_LABELS[status]}</span> }
export function HarvestPhoto({ row, index = 0, className = '' }: { row: HarvestListing; index?: number; className?: string }) {
  return row.image_paths[index] ? <img src={`/api/harvest/${row.id}/photos?index=${index}&v=${encodeURIComponent(row.updated_at)}`} alt={`Foto panen: ${row.title}`} loading="lazy" className={className} /> : <div className={'flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--theme-green)] ' + className}><Leaf className="h-10 w-10 opacity-50" aria-hidden="true" /><span className="text-xs">Belum ada foto</span></div>
}
export function HarvestNotice() { return <aside className="pm-soft flex items-start gap-3 text-xs leading-6"><ShoppingBasket className="mt-1 h-5 w-5 shrink-0 text-[var(--theme-green)]" aria-hidden="true" /><div><strong className="block text-sm">Terhubung langsung dengan pemilik panen</strong>SIMANTRI menyajikan informasi penawaran dan kontak. Pastikan stok, mutu, harga, serta kesepakatan langsung dengan penjual. Pembayaran dan pengiriman diatur di luar aplikasi.</div></aside> }
export function HarvestEmpty({ mine = false, filtered = false }: { mine?: boolean; filtered?: boolean }) { return <div className="pm-panel py-14 text-center"><Package className="mx-auto h-12 w-12 text-[var(--theme-green)] opacity-60" aria-hidden="true" /><h2 className="mt-5 text-xl font-bold">{filtered ? 'Belum ada penawaran yang cocok' : mine ? 'Mulai tawarkan hasil panenmu' : 'Belum ada panen yang dipublikasikan'}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--theme-muted)]">{filtered ? 'Coba ubah kata pencarian, varietas, atau status.' : mine ? 'Simpan informasi panen sebagai draf, tambahkan foto asli, lalu ajukan untuk ditinjau Admin.' : 'Penawaran akan muncul setelah petani mengajukan dan Admin mempublikasikannya.'}</p><Link href={mine ? '/dashboard/panen/baru' : '/dashboard/panen/saya'} className="sim-button-primary mt-5 inline-flex gap-2">{mine ? 'Buat penawaran baru' : 'Kelola panen saya'}<ArrowRight className="h-4 w-4" /></Link></div> }
export function HarvestBack() { return <Link href="/dashboard/panen/saya" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--theme-green)]"><ArrowLeft className="h-4 w-4" />Kembali ke panen saya</Link> }
export function HarvestLocation({ value }: { value: string }) { return <p className="flex items-start gap-1.5 text-xs leading-5 text-[var(--theme-muted)]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{value}</p> }
export async function harvestFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: 'no-store' })
  let json
  try { json = await response.json() } catch { throw new Error('Respons tidak dapat dibaca. Periksa koneksi dan coba lagi.') }
  if (!response.ok) throw new Error(typeof json.error === 'string' ? json.error : 'Permintaan belum berhasil.')
  return json as T
}
export function jsonRequest(method: string, body: unknown): RequestInit { return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } }
