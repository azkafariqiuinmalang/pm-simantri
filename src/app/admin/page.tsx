'use client'

import Link from 'next/link'
import { Database, BookOpen, Bot, ShoppingBasket } from 'lucide-react'
import { PageHeading } from '@/components/dashboard/DashboardUI'
import { useLanguage } from '@/components/ui/LanguageProvider'

export default function AdminPage() {
  const { t } = useLanguage()
  const cards = [
    { title: 'Data harga PIHPS', href: '/admin/market/input', icon: Database, description: 'Kelola sinkronisasi dan periksa sumber serta tanggal catatan harga.' },
    { title: 'Informasi penyakit', href: '/admin/penyakit', icon: BookOpen, description: 'Sunting gejala, pencegahan, tindakan awal, dan status publikasi empat materi katalog berujukan resmi.' },
    { title: 'AI Assistant RAG', href: '/dashboard/chat', icon: Bot, description: 'Tinjau jawaban SIMA dan rujukan knowledge base yang digunakan.' },
    { title: 'Moderasi Panen', href: '/admin/panen', icon: ShoppingBasket, description: 'Periksa pengajuan, foto, stok dan kontak; publikasikan penawaran atau kirim catatan perbaikan.' },
  ]
  return <div className="sim-page mx-auto max-w-7xl space-y-6">
    <PageHeading title={t('Portal Admin SIMANTRI')} description={t('Pengelolaan prototype PM dengan peran Petani dan Admin.')} />
    <div className="grid gap-4 sm:grid-cols-2">{cards.map(({ title, href, icon: Icon, description }) => <Link key={href} href={href} className="sim-card-flat sim-interactive-card block p-6">
      <Icon className="mb-4 h-7 w-7 text-[var(--theme-green)]" /><h2 className="text-lg font-bold">{t(title)}</h2><p className="mt-2 text-sm leading-6 text-[var(--sim-color-muted)]">{t(description)}</p>
    </Link>)}</div>
    <Link href="/dunia-brambang" className="sim-button-secondary">{t('Dunia Brambang')}</Link>
  </div>
}
