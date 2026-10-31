import { NextRequest, NextResponse } from 'next/server'
import { POST as syncPihps } from '@/app/api/market/sync-pihps/route'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: { message: 'Jadwal sinkronisasi belum dikonfigurasi.' } }, { status: 503 })
  if (req.headers.get('authorization') !== 'Bearer ' + secret) {
    return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
  }
  // Call the handler directly; do not forward credentials to a configurable host.
  const request = new NextRequest(new URL('/api/market/sync-pihps', req.url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secret },
    body: JSON.stringify({ mode: 'today' }),
  })
  return syncPihps(request)
}

export async function POST(req: NextRequest) { return GET(req) }
