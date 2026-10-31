import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isIsoDate, jakartaToday, marketRetentionStart } from '@/lib/market/pihps'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Silakan masuk.' } }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ data: null, error: { message: 'Hanya Admin yang dapat mencatat harga.' } }, { status: 403 })
    const body = await req.json().catch(() => ({}))
    const price = Number(body.harga)
    if (!isIsoDate(body.tanggal) || body.tanggal > jakartaToday() || body.tanggal < marketRetentionStart() || !Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ data: null, error: { message: 'Tanggal atau harga tidak valid.' } }, { status: 400 })
    }
    const { data, error } = await supabase.from('market_price').upsert({
      tanggal: body.tanggal, harga: price, source: 'manual', input_by: user.id,
    }, { onConflict: 'tanggal' }).select().single()
    if (error) throw error
    return NextResponse.json({ data: { price: data }, error: null })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Catatan harga tidak dapat disimpan.' } }, { status: 500 })
  }
}
