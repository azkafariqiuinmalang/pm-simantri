'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Bot, TrendingUp, ShoppingBasket, RefreshCw } from 'lucide-react'
import { PageHeading, PriceLineChart } from '@/components/dashboard/DashboardUI'
import { useLanguage } from '@/components/ui/LanguageProvider'

interface PricePoint { tanggal: string; harga: number; source: string }
const modules = [
  { title: 'Informasi Penyakit', href: '/dashboard/penyakit', icon: BookOpen, description: 'Pelajari foto referensi, gejala, dan panduan penanganan. Pencocokan dilakukan secara mandiri.' },
  { title: 'AI Assistant RAG', href: '/dashboard/chat', icon: Bot, description: 'Tanyakan budidaya bawang merah kepada SIMA dengan rujukan knowledge base.' },
  { title: 'Market Insight PIHPS', href: '/dashboard/harga', icon: TrendingUp, description: 'Baca harga aktual, riwayat, serta perbandingan provinsi berdasarkan data yang tersedia.' },
  { title: 'Harvest Listing', href: '/dashboard/panen', icon: ShoppingBasket, description: 'Cari penawaran panen, kelola stok sendiri, dan hubungi penjual setelah publikasi Admin.' },
]

export default function DashboardPage() {
  const { t } = useLanguage()
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch('/api/market/price/history?days=30', { cache: 'no-store' })
        const json = await response.json()
        if (!response.ok) throw new Error(json.error?.message || 'Data harga tidak dapat dimuat.')
        if (active) setHistory([...(json.data || [])].reverse())
      } catch {
        if (active) setError('Data harga tidak dapat dimuat. Buka Market Insight untuk mencoba kembali.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  return <div className="sim-page mx-auto max-w-7xl space-y-6">
    <PageHeading title={t('Dashboard SIMANTRI')} description={t('Informasi dan layanan bawang merah dalam satu prototype terintegrasi.')} />
    <div className="grid gap-4 sm:grid-cols-2">
      {modules.map(({ title, href, icon: Icon, description }) => <Link key={href} href={href} className="sim-card-flat sim-interactive-card block p-6">
        <Icon className="mb-4 h-7 w-7 text-[var(--theme-green)]" aria-hidden="true" />
        <h2 className="text-lg font-bold">{t(title)}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--sim-color-muted)]">{t(description)}</p>
      </Link>)}
    </div>
    <section className="sim-card-flat p-5 sm:p-6" aria-busy={loading}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">{t('Riwayat harga tersimpan')}</h2><p className="text-sm text-[var(--sim-color-muted)]">{t('Sumber dan cakupan setiap catatan dapat dilihat di Market Insight.')}</p></div>
        <Link href="/dashboard/harga" className="sim-button-secondary"><RefreshCw className="h-4 w-4" />{t('Market Insight')}</Link>
      </div>
      {loading ? <p role="status">{t('Memuat data harga...')}</p> : error ? <p role="alert">{t(error)}</p> : history.length === 0 ? <p>{t('Data harga belum tersedia. Tidak ada angka simulasi yang ditampilkan.')}</p> : <PriceLineChart points={history.map(item => ({ label: item.tanggal, value: Number(item.harga), source: item.source }))} />}
    </section>
    <Link href="/dunia-brambang" className="sim-button-secondary"><BookOpen className="h-4 w-4" />{t('Jelajahi Dunia Brambang')}</Link>
  </div>
}
