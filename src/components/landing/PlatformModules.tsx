'use client'

import Link from 'next/link'
import { BookOpen, Sparkles, ShoppingBasket, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/components/ui/LanguageProvider'

export function PlatformModules() {
  const { t } = useLanguage()
  const features = [
    { icon: BookOpen, title: t('Informasi Penyakit'), href: '/dashboard/penyakit', description: t('Pelajari gejala dan foto referensi penyakit tanpa diagnosis otomatis.') },
    { icon: Sparkles, title: t('AI Asisten (SIMA)'), href: '/dashboard/chat', description: t('Ajukan pertanyaan budidaya dan baca panduan dari asisten agronomi SIMA.') },
    { icon: TrendingUp, title: t('Market Insight PIHPS'), href: '/dashboard/harga', description: t('Bandingkan harga aktual antarprovinsi dan baca riwayat yang tersedia.') },
    { icon: ShoppingBasket, title: t('Harvest Listing'), href: '/dashboard/panen', description: t('Modul listing panen masih dalam tahap pengembangan, belum menjadi marketplace aktif.') },
  ]
  return <section id="masalah" aria-labelledby="platform-modules-title" className="w-full scroll-mt-24 bg-[#FAF7F2] px-4 py-16 dark:bg-[var(--theme-canvas)] sm:px-6 lg:px-14 lg:py-24">
    <div className="mx-auto max-w-6xl">
      <div data-entrance className="mx-auto mb-10 max-w-2xl text-center">
        <h2 id="platform-modules-title" className="font-editorial text-[32px] font-medium leading-tight tracking-tight text-[#1A221D] dark:text-[var(--theme-ink)] sm:text-[42px]">{t('Empat modul SIMANTRI PM')}</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-[#5E665F] dark:text-[var(--theme-body)]">{t('Prototype untuk uji coba terbatas: informasi penyakit, SIMA, harga PIHPS, dan listing panen.')}</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, description, href }, index) => <article data-entrance key={href} className="rounded-2xl border border-[#173e2d]/10 bg-white p-6 dark:border-[var(--theme-line)] dark:bg-[var(--theme-surface)]">
          <div className="flex items-center justify-between text-[#275a3d] dark:text-[var(--theme-green)]"><Icon className="h-6 w-6" aria-hidden="true" /><span className="font-mono text-xs" aria-hidden="true">0{index + 1}</span></div>
          <h3 className="mt-5 font-editorial text-xl font-semibold text-[#1A221D] dark:text-[var(--theme-ink)]"><Link href={href} className="underline-offset-4 hover:underline">{title}</Link></h3>
          <p className="mt-3 text-sm leading-relaxed text-[#5E665F] dark:text-[var(--theme-body)]">{description}</p>
        </article>)}
      </div>
    </div>
  </section>
}
