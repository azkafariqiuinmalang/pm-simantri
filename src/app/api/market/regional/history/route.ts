import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calendarDates, isIsoDate, jakartaToday, marketRetentionStart, MARKET_RETENTION_DAYS, parsePihpsPriceType, pihpsPriceTypeInfo, PIHPS_COMMODITY } from '@/lib/market/pihps'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const priceType = parsePihpsPriceType(params.get('price_type'))
  if (priceType === null) return NextResponse.json({ data: null, error: { message: 'Jenis harga tidak valid.' } }, { status: 400 })
  const typeInfo = pihpsPriceTypeInfo(priceType)
  const province = Number(params.get('province'))
  const days = Number(params.get('days') || 30)
  const end = params.get('end') || jakartaToday()
  if (!Number.isInteger(province) || province <= 0 || !Number.isInteger(days) || days < 1 || days > MARKET_RETENTION_DAYS || !isIsoDate(end) || end > jakartaToday()) {
    return NextResponse.json({ data: null, error: { message: 'Provinsi, tanggal, atau rentang hari tidak valid.' } }, { status: 400 })
  }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Silakan masuk.' } }, { status: 401 })
    const start = [calendarDates(end, days)[0], marketRetentionStart()].sort().at(-1)!
    const { data, error } = await supabase.from('market_regional_price')
      .select('id,tanggal,prov_id,provinsi,harga,price_type')
      .eq('prov_id', province).eq('price_type', priceType).eq('komoditas', PIHPS_COMMODITY)
      .gte('tanggal', start).lte('tanggal', end)
      .gt('harga', 0).order('tanggal', { ascending: true })
    if (error) throw error
    return NextResponse.json({ data: data || [], meta: { start, end, days, province, source_url: typeInfo.source_url, commodity: PIHPS_COMMODITY, price_type: typeInfo.label, price_type_id: priceType }, error: null }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Riwayat harga tidak dapat dimuat.' } }, { status: 500 })
  }
}
