import Link from 'next/link'
import { ArrowUpRight, Calculator, LockKeyhole } from 'lucide-react'
import { calculatePlan, decimal, money, type FarmPlanInput } from '@/lib/farm-plans/shared'

export default function PlanSummary({ plan }: { plan: FarmPlanInput }) {
  const s = calculatePlan(plan)
  const amount = (n: number | null) => n === null ? 'Belum dihitung' : money(n)
  return <aside className="farm-summary space-y-5">
    <section className="farm-result" aria-labelledby="farm-result-title">
      <div className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-5 w-5" aria-hidden="true" /><h2 id="farm-result-title">{plan.status === 'completed' ? 'Hasil musim tercatat' : 'Perkiraan hasil usaha'}</h2></div>
      <p className="mt-5 text-xs">{plan.status === 'completed' ? 'Laba / rugi berdasarkan catatanmu' : 'Estimasi laba / rugi satu musim'}</p>
      <p className="farm-result-number">{amount(plan.status === 'completed' ? s.finalProfit : s.forecastProfit)}</p>
      <p className="mt-2 text-xs leading-6">{s.forecastProfit === null ? 'Lengkapi biaya serta perkiraan hasil dan harga jual untuk melihat hitungan.' : s.forecastProfit > 0 ? 'Hasil perhitungan: untung.' : s.forecastProfit < 0 ? 'Hasil perhitungan: rugi. Coba periksa harga, hasil panen, dan biaya.' : 'Hasil perhitungan: impas.'}</p>
      <dl className="mt-6 space-y-3 border-t border-white/25 pt-5 text-sm">
        <div className="flex justify-between gap-4"><dt>Penerimaan {plan.status === 'completed' ? 'tercatat' : 'diperkirakan'}</dt><dd>{amount(s.forecastRevenue)}</dd></div>
        <div className="flex justify-between gap-4"><dt>Biaya {plan.costs_confirmed ? 'tercatat' : 'akhir diperkirakan'}</dt><dd>{amount(s.forecastCost)}</dd></div>
      </dl>
      <p className="mt-5 text-xs leading-6 opacity-90">{plan.costs_confirmed ? 'Seluruh biaya dinyatakan sudah dicatat oleh pemilik.' : 'Biaya akhir = pengeluaran tercatat + sisa anggaran per kategori. Anggaran dan pengeluaran tidak dijumlahkan dua kali.'}</p>
    </section>
    <section className="farm-panel">
      <h2 className="farm-section-title">Batas harga dan hasil</h2>
      <dl className="farm-details mt-4">
        <div><dt>Harga impas seluruh panen</dt><dd>{s.breakEvenPrice === null ? 'Perlu biaya dan berat panen' : `${money(s.breakEvenPrice)}/kg`}</dd></div>
        {plan.sale_method === 'per_kg' && <div><dt>Harga minimum sisa panen untuk menutup biaya</dt><dd>{s.requiredPrice === null ? 'Belum dihitung' : `${money(s.requiredPrice)}/kg`}</dd></div>}
        <div><dt>Hasil siap jual {plan.actual_yield_kg === null ? '(perkiraan)' : '(aktual)'}</dt><dd>{s.yieldKg === null ? 'Belum diisi' : `${decimal(s.yieldKg)} kg`}</dd></div>
        <div><dt>Berat penjualan tercatat</dt><dd>{decimal(s.soldKg)} kg{s.unknownSaleWeight ? ' + tebasan tanpa berat' : ''}</dd></div>
        <div><dt>Sisa {plan.actual_yield_kg === null ? 'perkiraan' : 'panen'}</dt><dd>{s.remainingKg === null ? 'Belum dapat ditentukan' : `${decimal(s.remainingKg)} kg`}</dd></div>
        {plan.area_m2 !== null && <div><dt>Luas lahan</dt><dd>{decimal(plan.area_m2)} m² · {decimal(plan.area_m2 / 10000)} ha</dd></div>}
        {s.costPerM2 !== null && <div><dt>Biaya per 1.000 m² untuk catatan ini</dt><dd>{money(Math.round(s.costPerM2 * 1000))}</dd></div>}
        {s.ratio !== null && <div><dt>Rasio penerimaan / biaya (R/C)</dt><dd>{decimal(s.ratio)}</dd></div>}
      </dl>
      <p className="farm-help mt-4">Harga impas membagi biaya satu musim dengan berat siap jual. Ini bukan prediksi harga pasar. R/C di atas 1 berarti penerimaan dalam perhitungan melebihi biaya.</p>
      <Link href="/dashboard/harga" className="farm-text-link mt-4">Bandingkan harga PIHPS<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
    </section>
    <section className="farm-panel">
      <div className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[var(--theme-green)]" aria-hidden="true" /><h2 className="farm-section-title">Catatan keuangan pribadi</h2></div>
      <p className="farm-help mt-3">Modal, pengeluaran, dan hasil usaha hanya dapat dibuka oleh akun pemilik. Data tersebut tidak ditampilkan pada penawaran marketplace.</p>
      <p className="farm-help mt-3">Hasil mengikuti angka yang kamu masukkan. Lengkapi sewa, tenaga kerja, dan alokasi penggunaan alat jika ingin menghitung biaya usaha secara menyeluruh.</p>
    </section>
  </aside>
}
