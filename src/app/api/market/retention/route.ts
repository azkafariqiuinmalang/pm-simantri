import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// No date/cutoff supplied by the browser. The database owns the retention clock.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ data: null, error: { message: 'Silakan masuk.' } }, { status: 401 })
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profileError || profile?.role !== 'admin') return NextResponse.json({ data: null, error: { message: 'Pembersihan harga hanya untuk Admin.' } }, { status: 403 })
    const { data, error } = await supabase.rpc('prune_expired_market_prices')
    if (error || !data) throw new Error('Retention failed')
    return NextResponse.json({ data, error: null }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Pembaruan harga tersimpan, tetapi pembersihan riwayat gagal. Silakan ulangi sinkronisasi.' } }, { status: 500 })
  }
}
