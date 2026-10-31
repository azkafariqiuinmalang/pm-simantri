import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DISEASE_CATALOGUE, DISEASE_COLUMNS, diseaseContent, isDiseaseEntry, validateDiseaseEdit } from '@/lib/diseases/catalogue'

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin')
  // Next may reconstruct request.url with its internal hostname. Compare the
  // browser origin to the actual request Host, not a proxy's internal URL.
  if (origin) {
    let validOrigin = false
    try {
      const parsed = new URL(origin)
      validOrigin = ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password &&
        parsed.host === (request.headers.get('host') || new URL(request.url).host)
    } catch { /* Malformed/null origins fail closed. */ }
    if (!validOrigin) return NextResponse.json({ error: 'Asal permintaan tidak diizinkan.' }, { status: 403 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Silakan login.' }, { status: 401 })
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileError || profile?.role !== 'admin') return NextResponse.json({ error: 'Hanya Admin yang dapat mengubah katalog.' }, { status: 403 })
  let input
  try {
    if (Number(request.headers.get('content-length')) > 40000) return NextResponse.json({ error: 'Materi terlalu panjang.' }, { status: 413 })
    const body = await request.text()
    if (body.length > 40000) return NextResponse.json({ error: 'Materi terlalu panjang.' }, { status: 413 })
    input = validateDiseaseEdit(JSON.parse(body))
  } catch { return NextResponse.json({ error: 'Format data tidak valid.' }, { status: 400 }) }
  if (!input) return NextResponse.json({ error: 'Periksa judul, ringkasan, daftar materi, dan status publikasi.' }, { status: 400 })
  const { data: current, error } = await supabase.from('knowledge_entries').select(DISEASE_COLUMNS).eq('id', input.id)
    .eq('category', 'Penyakit Tanaman').contains('metadata', { catalogue: DISEASE_CATALOGUE }).maybeSingle()
  if (error) return NextResponse.json({ error: 'Katalog belum dapat dibaca.' }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Materi katalog tidak ditemukan.' }, { status: 404 })
  if (!isDiseaseEntry(current)) return NextResponse.json({ error: 'Struktur katalog perlu diperiksa.' }, { status: 422 })
  if (current.updated_at !== input.updated_at) return NextResponse.json({ error: 'Materi sudah diubah. Muat ulang sebelum menyimpan.' }, { status: 409 })
  // Source provenance and photo rights stay server-owned; no role/source claims from the browser.
  const disease = { ...current.metadata.disease, symptoms: input.symptoms, prevention: input.prevention, first_steps: input.first_steps }
  const { data: saved, error: saveError } = await supabase.from('knowledge_entries').update({
    title: input.title, summary: input.summary, content: diseaseContent(input.title, input.summary, disease),
    metadata: { ...current.metadata, disease }, status: input.status, updated_at: new Date().toISOString(),
  }).eq('id', input.id).eq('updated_at', input.updated_at).eq('category', 'Penyakit Tanaman')
    .contains('metadata', { catalogue: DISEASE_CATALOGUE }).select(DISEASE_COLUMNS).maybeSingle()
  if (saveError) return NextResponse.json({ error: 'Materi gagal disimpan.' }, { status: 500 })
  if (!saved) return NextResponse.json({ error: 'Materi sudah berubah. Muat ulang sebelum menyimpan.' }, { status: 409 })
  return NextResponse.json({ data: saved })
}
