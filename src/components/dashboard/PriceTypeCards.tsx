'use client'
import { useEffect, useState } from 'react'
import { Tractor, Truck, Store, ShoppingCart } from 'lucide-react'
import { PIHPS_PRICE_TYPES, type PihpsPriceType } from '@/lib/market/pihps'
import { useLanguage } from '@/components/ui/LanguageProvider'

type Quote = { harga: number; provinsi: string; tanggal: string; prov_id: number }
const icons = [Tractor,Truck,Store,ShoppingCart]
export default function PriceTypeCards({ value, onChange, province, date, revision }: { value: PihpsPriceType; onChange: (value:PihpsPriceType)=>void; province:string; date:string; revision:number }) {
  const {t} = useLanguage()
  const [quotes,setQuotes] = useState<Record<number,Quote | null>>({}), [loading,setLoading] = useState(true), [failed,setFailed] = useState<number[]>([])
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true);setQuotes({});setFailed([])
      const results = await Promise.allSettled(PIHPS_PRICE_TYPES.map(async type => {
        const params = new URLSearchParams({price_type:String(type.id)});if(date) params.set('date',date)
        const response = await fetch('/api/market/regional?'+params,{signal:controller.signal,cache:'no-store'})
        const json = await response.json();if(!response.ok) throw new Error('Tidak tersedia')
        const rows: Quote[] = json.data || []
        const quote = rows.find(row => province ? String(row.prov_id)===province : row.provinsi==='Jawa Timur') || null
        return {id:type.id,quote}
      }))
      if(controller.signal.aborted) return
      const next:Record<number,Quote|null>={},errors:number[]=[]
      results.forEach((r,i)=>{if(r.status==='fulfilled')next[r.value.id]=r.value.quote;else errors.push(PIHPS_PRICE_TYPES[i].id)})
      setQuotes(next);setFailed(errors);setLoading(false)
    }
    void load();return ()=>controller.abort()
  },[province,date,revision])
  return <section className="space-y-3" aria-label={t('Pilih jenis harga')}><div className="flex flex-wrap justify-between gap-2 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-muted)]"><span>{t('Tingkat rantai distribusi')}</span><span>{t('Harga per provinsi · seri data terpisah')}</span></div><div className="pm-distribution" role="group" aria-label={t('Pilih jenis harga')}>{PIHPS_PRICE_TYPES.map((type,i)=>{const Icon=icons[i],quote=quotes[type.id];return <button key={type.id} type="button" aria-pressed={value===type.id} onClick={()=>onChange(type.id)}><div className="flex items-center justify-between gap-2"><div className="pm-stat-icon"><Icon className="h-5 w-5" /></div><span className="pm-badge">ID {type.id}</span></div><p className="mt-5 text-[10px] text-[var(--theme-muted)]">{t('Tingkat')} {i+1}</p><h2 className="mt-1 text-base font-bold tracking-tight">{t(type.label)}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-[var(--theme-muted)]">{t(type.description)}</p><p className="mt-4 text-xl font-bold tracking-tight text-[var(--theme-green)]">{loading?'…':quote?'Rp'+Number(quote.harga).toLocaleString('id-ID'):failed.includes(type.id)?t('Gagal dimuat'):t('Belum tersedia')}{quote&&!loading&&<span className="ml-1 text-[10px] font-normal">/kg</span>}</p><p className="mt-2 text-[10px] leading-5 text-[var(--theme-muted)]">{loading?t('Memuat...'):quote?quote.provinsi+' · '+quote.tanggal:t('Tidak ada data untuk provinsi dan tanggal ini.')}</p></button>})}</div></section>
}
