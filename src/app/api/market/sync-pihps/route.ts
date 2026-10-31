import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calendarDates, formatPihpsDate, isIsoDate, jakartaToday, latestPihpsObservation, marketRetentionStart, normalizePihpsRows, parsePihpsPriceType, pihpsPriceTypeInfo, pihpsSourceDates, PIHPS_COMMODITY } from '@/lib/market/pihps'

const PIHPS_BASE_URL = 'https://www.bi.go.id/hargapangan/WebSite/Home/GetGridData1'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const secret = process.env.CRON_SECRET
    const isCron = Boolean(secret) && req.headers.get('authorization') === 'Bearer ' + secret
    // Do not pretend a cron secret turns a public/cookie client into a
    // privileged writer. Scheduled server credentials are not configured yet.
    if (isCron) return NextResponse.json({ data: null, error: { message: 'Sinkronisasi otomatis belum diaktifkan. Gunakan sesi Admin.', code: 'CRON_NOT_READY' } }, { status: 503 })
    let userId: string | null = null
    if (!isCron) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ data: null, error: { message: 'Silakan masuk.', code: 'UNAUTHORIZED' } }, { status: 401 })
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (error || profile?.role !== 'admin') return NextResponse.json({ data: null, error: { message: 'Sinkronisasi hanya untuk Admin.', code: 'FORBIDDEN' } }, { status: 403 })
      userId = user.id
    }
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ data: null, error: { message: 'Isi permintaan harus berupa objek JSON.', code: 'BAD_REQUEST' } }, { status: 400 })
    }
    const mode = body.mode || 'today'
    const priceType = parsePihpsPriceType(body.price_type)
    if (priceType === null) return NextResponse.json({ data: null, error: { message: 'Jenis harga tidak valid.', code: 'BAD_REQUEST' } }, { status: 400 })
    const typeInfo = pihpsPriceTypeInfo(priceType)
    const days = Number(body.days ?? 30)
    const end = mode === 'latest' ? jakartaToday() : body.tanggal || jakartaToday()
    if (!['today', 'backfill', 'latest'].includes(mode) || !isIsoDate(end) || !Number.isInteger(days) || days < 1 || days > 30 || end > jakartaToday()) {
      return NextResponse.json({ data: null, error: { message: 'Mode, tanggal, atau rentang hari tidak valid.', code: 'BAD_REQUEST' } }, { status: 400 })
    }
    const dates = calendarDates(end, mode === 'backfill' ? days : 1)
    if (dates[0] < marketRetentionStart()) return NextResponse.json({ data: null, error: { message: 'Sinkronisasi dibatasi pada 60 hari kalender terakhir.', code: 'BAD_REQUEST' } }, { status: 400 })
    const results: Array<{ date: string; status: string; regional_count?: number; jatim_price?: number | null; source_dates?: string[]; skipped_count?: number; message?: string }> = []
    for (const date of dates) {
      try {
        const params = new URLSearchParams({ tanggal: formatPihpsDate(date), commodity: '5_11', priceType: String(priceType), isPasokan: '1', jenis: '1', periode: '1', provId: '0' })
        const response = await fetch(PIHPS_BASE_URL + '?' + params, {
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'User-Agent': 'Mozilla/5.0' },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        })
        if (!response.ok) throw new Error('PIHPS tidak dapat diakses.')
        const payload = await response.json()
        if (!payload || !Array.isArray(payload.data)) throw new Error('Format respons PIHPS tidak dikenali.')
        const sourceDates = pihpsSourceDates(payload.data)
        // Latest may return Friday on a weekend: keep the real source date.
        const latest = mode === 'latest' ? latestPihpsObservation(payload.data, date, priceType) : null
        const observationDate = latest?.date || date
        const records = mode === 'latest' ? latest?.records || [] : normalizePihpsRows(payload.data, date, priceType)
        if (!records.length) {
          const carriedForward = sourceDates.length > 0 && !sourceDates.includes(date)
          results.push({ date, status: !payload.data.length ? 'no_data' : carriedForward ? 'no_publication' : 'invalid_data', regional_count: 0, source_dates: sourceDates,
            message: carriedForward ? 'PIHPS mengembalikan publikasi tanggal lain; tidak dicatat sebagai harga tanggal permintaan.' : undefined })
          continue
        }
        const { error: regionalError } = await supabase.rpc('upsert_scraped_regional_price', { p_records: records })
        if (regionalError) throw new Error('Penyimpanan harga regional gagal.')
        // Keep legacy history compatibility, but never substitute another region
        // or a fabricated price for a missing East Java publication.
        const jatim = records.find(row => row.prov_id === 16 && /jawa timur/i.test(row.provinsi))
          ?? records.find(row => /jawa timur/i.test(row.provinsi))
        // The legacy single-series table represents producer prices only.
        if (jatim && priceType === 4) {
          const { error: marketError } = await supabase.rpc('upsert_scraped_market_price', {
            p_tanggal: observationDate, p_harga: jatim.harga, p_source: 'scraping', p_input_by: userId,
          })
          if (marketError) {
            results.push({ date, status: 'partial', regional_count: records.length, message: 'Regional tersimpan, riwayat Jawa Timur gagal disimpan.' })
            continue
          }
        }
        results.push({ date: observationDate, status: 'synced', regional_count: records.length, jatim_price: jatim?.harga ?? null, source_dates: sourceDates, skipped_count: payload.data.length - records.length })
      } catch (error) {
        results.push({ date, status: 'error', message: error instanceof Error ? error.message : 'Sinkronisasi gagal.' })
      }
    }
    const failed = results.some(item => ['error', 'partial', 'invalid_data'].includes(item.status))
    return NextResponse.json({
      data: { results, source: 'PIHPS Bank Indonesia', source_url: typeInfo.source_url, commodity: PIHPS_COMMODITY, price_type: typeInfo.label, price_type_id: priceType },
      error: failed ? { message: 'Sebagian data gagal diproses. Periksa rincian sinkronisasi.', code: 'SYNC_PARTIAL_FAILURE' } : null,
    }, { status: failed ? 502 : 200 })
  } catch {
    return NextResponse.json({ data: null, error: { message: 'Sinkronisasi tidak dapat diproses.', code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}
