import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isIsoDate, jakartaToday, parsePihpsPriceType, pihpsPriceTypeInfo, PIHPS_COMMODITY } from '@/lib/market/pihps'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const priceType = parsePihpsPriceType(req.nextUrl.searchParams.get('price_type'))
  if (priceType === null) return NextResponse.json({ data: null, error: { message: 'Jenis harga tidak valid.' } }, { status: 400 })
  const typeInfo = pihpsPriceTypeInfo(priceType)
  if (date && (!isIsoDate(date) || date > jakartaToday())) return NextResponse.json({ data: null, error: { message: 'Tanggal tidak valid atau masih di masa depan.' } }, { status: 400 })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Silakan masuk.' } }, { status: 401 })
    let effectiveDate = date
    if (!effectiveDate) {
      const { data, error } = await supabase.from('market_regional_price').select('tanggal')
        .eq('price_type', priceType).eq('komoditas', PIHPS_COMMODITY).gt('harga', 0)
        .order('tanggal', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      effectiveDate = data?.tanggal || null
    }
    const meta = { date: effectiveDate, source: 'PIHPS Bank Indonesia', source_url: typeInfo.source_url, commodity: PIHPS_COMMODITY, price_type: typeInfo.label, price_type_id: priceType }
    if (!effectiveDate) return NextResponse.json({ data: [], meta, error: null }, { headers: { 'Cache-Control': 'private, no-store' } })
    const { data, error } = await supabase.from('market_regional_price')
      .select('id,tanggal,prov_id,provinsi,komoditas,price_type,harga,harga_diff,semua_provinsi,percentage,source_url,created_at,updated_at')
      .eq('tanggal', effectiveDate).eq('price_type', priceType).eq('komoditas', PIHPS_COMMODITY)
      .gt('harga', 0).order('harga', { ascending: false })
    if (error) throw error
    return NextResponse.json({ data: data || [], meta, error: null }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Harga regional tidak dapat dimuat.' } }, { status: 500 })
  }
}
