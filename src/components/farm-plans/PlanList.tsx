'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CalendarDays, Plus, Sprout, ShoppingBasket } from 'lucide-react'
import { calculatePlan, decimal, money, type FarmPlan } from '@/lib/farm-plans/shared'

export default function PlanList({ plans }: { plans: FarmPlan[] }) {
  const [filter, setFilter] = useState('all')
  const visible = plans.filter(p => filter === 'all' || p.status === filter)
  return <div className="farm-page">
    <section className="farm-intro">
      <p className="farm-eyebrow">Dari rencana tanam sampai penjualan</p>
      <h1>Rencana Usaha Tani</h1>
      <p>Hitung kebutuhan modal, catat pengeluaran, dan lihat hasil penjualan bawang merahmu dalam satu musim.</p>
    </section>
    <section className="farm-start" aria-label="Pilih titik awal perhitungan">
      <Link href="/dashboard/rencana/baru?mode=planning" className="farm-start-option">
        <Sprout className="h-7 w-7 text-[var(--theme-green)]" aria-hidden="true" />
        <div><h2>Belum tanam / masih budidaya</h2><p>Mulai dari luas lahan, susun anggaran, lalu ikuti biaya sampai panen.</p></div><ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
      <Link href="/dashboard/rencana/baru?mode=selling" className="farm-start-option">
        <ShoppingBasket className="h-7 w-7 text-[var(--theme-green)]" aria-hidden="true" />
        <div><h2>Sudah panen</h2><p>Masukkan hasil dan biaya yang sudah keluar untuk menentukan harga penawaran.</p></div><ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
    <section className="farm-panel">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-xl font-bold">Catatan musim saya</h2><p className="farm-help mt-2">{plans.length} rencana tersimpan · hanya untuk akunmu</p></div>
        <label className="farm-field">Tampilkan<select className="farm-input" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Semua rencana</option><option value="active">Masih berjalan</option><option value="completed">Musim selesai</option></select></label>
      </div>
      {visible.length === 0 ? <div className="py-12 text-center"><CalendarDays className="mx-auto h-8 w-8 text-[var(--theme-green)]" aria-hidden="true" /><h3 className="mt-4 font-semibold">{plans.length ? 'Belum ada rencana pada pilihan ini' : 'Mulai dari kondisi lahannya sekarang'}</h3><p className="farm-help mx-auto mt-3 max-w-md">{plans.length ? 'Ubah pilihan untuk membuka rencana lainnya.' : 'Pilih salah satu titik awal di atas. Kamu bisa melengkapi dan memperbarui catatan secara bertahap.'}</p></div> :
      <ul className="mt-6 divide-y divide-[var(--theme-line)]">{visible.map(plan => {
        const result = calculatePlan(plan)
        return <li key={plan.id}><Link href={`/dashboard/rencana/${plan.id}`} className="farm-plan-row">
          <div className="min-w-0"><span className="farm-status">{plan.status === 'completed' ? 'Musim selesai' : plan.actual_yield_kg !== null ? 'Panen & penjualan' : 'Perencanaan & budidaya'}</span><h3 className="mt-2 break-words text-lg font-bold">{plan.name}</h3><p className="farm-help mt-2">{[plan.location, plan.variety, plan.area_m2 === null ? '' : `${decimal(plan.area_m2)} m²`].filter(Boolean).join(' · ') || 'Informasi lahan belum dilengkapi'}</p></div>
          <div className="flex items-center gap-5"><div><p className="farm-help">{plan.status === 'completed' ? 'Laba / rugi tercatat' : 'Estimasi laba / rugi'}</p><p className="mt-1 font-bold">{result.forecastProfit === null ? 'Belum dihitung' : money(result.forecastProfit)}</p></div><ArrowRight className="h-5 w-5 shrink-0 text-[var(--theme-green)]" aria-hidden="true" /></div>
        </Link></li>
      })}</ul>}
      {plans.length >= 40 && <p role="status" className="farm-help mt-4">Menampilkan 40 rencana yang terakhir diperbarui. Rencana lama tetap dapat dibuka melalui tautannya.</p>}
    </section>
    <Link href="/dashboard/rencana/baru?mode=planning" className="farm-button farm-button-primary w-fit"><Plus className="h-4 w-4" aria-hidden="true" />Buat rencana baru</Link>
  </div>
}
