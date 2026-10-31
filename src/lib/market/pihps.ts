export const PIHPS_COMMODITY = 'Bawang Merah Ukuran Sedang'
export const MARKET_RETENTION_DAYS = 60
export const PIHPS_SOURCE_URL = 'https://www.bi.go.id/hargapangan/TabelHarga/ProdusenDaerah'

export const PIHPS_PRICE_TYPES = [
  { id: 4, label: 'Produsen', description: 'Harga di tingkat penghasil, seperti petani atau kelompok tani.', source_url: PIHPS_SOURCE_URL },
  { id: 3, label: 'Pedagang Besar', description: 'Harga grosir untuk perdagangan dalam jumlah besar kepada usaha lain.', source_url: 'https://www.bi.go.id/hargapangan/TabelHarga/PedagangBesarDaerah' },
  { id: 1, label: 'Pasar Tradisional', description: 'Harga eceran yang dibayar konsumen di pasar tradisional.', source_url: 'https://www.bi.go.id/hargapangan/TabelHarga/PasarTradisionalDaerah' },
  { id: 2, label: 'Pasar Modern', description: 'Harga eceran yang dibayar konsumen di pasar modern.', source_url: 'https://www.bi.go.id/hargapangan/TabelHarga/PasarModernDaerah' },
] as const
export type PihpsPriceType = typeof PIHPS_PRICE_TYPES[number]['id']

/** Missing means producer for existing callers; invalid input never falls back. */
export function parsePihpsPriceType(value: unknown): PihpsPriceType | null {
  if (value === undefined || value === null) return 4
  if (typeof value !== 'number' && typeof value !== 'string') return null
  return PIHPS_PRICE_TYPES.find(type => value === type.id || value === String(type.id))?.id ?? null
}

export function pihpsPriceTypeInfo(id: PihpsPriceType) {
  return PIHPS_PRICE_TYPES.find(type => type.id === id)!
}

export interface PihpsRegionalRecord {
  tanggal: string
  prov_id: number
  provinsi: string
  komoditas: string
  price_type: number
  harga: number
  harga_diff: string
  semua_provinsi: number
  percentage: number
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function jakartaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

export function formatPihpsDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] + ' ' + day + ', ' + year
}

/** Dates are publication dates from PIHPS, not the date we requested/fetched. */
export function parsePihpsPublishedDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return isIsoDate(value) ? value : null
  const match = value.trim().match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{2}|\d{4})$/)
  if (!match) return null
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', agu: '08', ags: '08', agt: '08', aug: '08',
    sep: '09', okt: '10', oct: '10', nov: '11', des: '12', dec: '12',
  }
  const month = months[match[2].toLowerCase()]
  if (!month) return null
  const year = match[3].length === 2 ? '20' + match[3] : match[3]
  const date = `${year}-${month}-${match[1].padStart(2, '0')}`
  return isIsoDate(date) ? date : null
}

export function calendarDates(end: string, days: number): string[] {
  if (!isIsoDate(end) || !Number.isInteger(days) || days < 1 || days > 365) return []
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end + 'T00:00:00Z')
    date.setUTCDate(date.getUTCDate() - days + index + 1)
    return date.toISOString().slice(0, 10)
  })
}

/** Inclusive calendar window: today and the preceding 59 days (Asia/Jakarta). */
export function marketRetentionStart(today = jakartaToday()): string {
  return calendarDates(today, MARKET_RETENTION_DAYS)[0]
}

export function latestPihpsObservation(rows: unknown, end: string, priceType: PihpsPriceType) {
  const start = marketRetentionStart(end)
  for (const date of pihpsSourceDates(rows).filter(date => date >= start && date <= end).reverse()) {
    const records = normalizePihpsRows(rows, date, priceType)
    if (records.length) return { date, records }
  }
  return null
}

export function pihpsSourceDates(rows: unknown): string[] {
  if (!Array.isArray(rows)) return []
  return [...new Set(rows.flatMap(row => {
    const date = parsePihpsPublishedDate(row?.Tanggal)
    return date ? [date] : []
  }))].sort()
}

// PIHPS supplies numeric JSON values. Reject missing/locale-formatted strings
// rather than guessing a price or substituting a national value.
function positiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value))) return null
  const result = Number(value)
  return Number.isFinite(result) && result > 0 ? result : null
}

export function normalizePihpsRows(rows: unknown, date: string, priceType: PihpsPriceType = 4): PihpsRegionalRecord[] {
  if (!Array.isArray(rows) || !isIsoDate(date) || parsePihpsPriceType(priceType) === null) return []
  const unique = new Map<number, PihpsRegionalRecord>()
  for (const candidate of rows) {
    if (!candidate || typeof candidate !== 'object') continue
    const item = candidate as Record<string, unknown>
    // PIHPS can return Friday's publication for a weekend request. Do not
    // manufacture Saturday/Sunday observations or accept another commodity.
    if (parsePihpsPublishedDate(item.Tanggal) !== date || item.Komoditas !== PIHPS_COMMODITY) continue
    const id = positiveNumber(item.ProvID)
    const price = positiveNumber(item.Nilai)
    if (id === null || !Number.isInteger(id) || price === null || typeof item.Provinsi !== 'string' || !item.Provinsi.trim()) continue
    unique.set(id, {
      tanggal: date,
      prov_id: id,
      provinsi: item.Provinsi.trim(),
      komoditas: PIHPS_COMMODITY,
      price_type: priceType,
      harga: price,
      harga_diff: typeof item.NilaiDiff === 'string' ? item.NilaiDiff : '',
      semua_provinsi: positiveNumber(item.SemuaProvinsi) ?? 0,
      percentage: Number.isFinite(Number(item.Percentage)) ? Number(item.Percentage) : 0,
    })
  }
  return [...unique.values()]
}
