import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calendarDates, isIsoDate, jakartaToday, marketRetentionStart, MARKET_RETENTION_DAYS, PIHPS_SOURCE_URL } from '@/lib/market/pihps'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get('days') || '30')
    const end = searchParams.get('end') || jakartaToday()
    if (!Number.isInteger(days) || days < 1 || days > MARKET_RETENTION_DAYS || !isIsoDate(end) || end > jakartaToday()) {
      return NextResponse.json({ data: null, error: { message: 'Rentang hari tidak valid.' } }, { status: 400 })
    }

    const start = [calendarDates(end, days)[0], marketRetentionStart()].sort().at(-1)!
    const { data: prices, error } = await supabase
      .from('market_price')
      .select('id,tanggal,harga,source,region_name,source_url,created_at,updated_at')
      .gte('tanggal', start).lte('tanggal', end)
      .order('tanggal', { ascending: false })
      .limit(days)

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: prices,
      meta: { start, end, days, region: 'Jawa Timur', source_url: PIHPS_SOURCE_URL },
      error: null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error'
    return NextResponse.json(
      { data: null, error: { message: msg, code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
