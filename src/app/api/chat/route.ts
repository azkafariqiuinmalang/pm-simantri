import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { chatLanguageInstruction, normalizeLanguage, translate } from '@/lib/i18n'
import type { ChatAnswerMode } from '@/lib/chat/response'
import {
  validateUserInput,
  detectPromptInjection,
  buildSecureSystemPrompt,
  encapsulateUserPrompt,
  sanitizeAiOutput,
} from '@/lib/security/ai-guardrails'

interface KnowledgeEntryMatch {
  doc_id: string
  title: string
  summary: string | null
  content: string
  keywords: string[] | null
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ data: null, error: { message: 'Silakan masuk kembali untuk menggunakan SIMA.', code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const language = normalizeLanguage(body?.language)

    // -------------------------------------------------------------------------
    // LAYER 1: INPUT VALIDATION & NORMALIZATION
    // -------------------------------------------------------------------------
    const validation = validateUserInput(body?.message)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: validation.error?.message || 'Pesan tidak valid',
            code: validation.error?.code || 'INVALID_INPUT',
          },
        },
        { status: 400 }
      )
    }

    const userMessage = validation.sanitizedMessage

    // -------------------------------------------------------------------------
    // LAYER 2: PROMPT INJECTION & INTENT RISK DETECTION
    // -------------------------------------------------------------------------
    const injectionAnalysis = detectPromptInjection(userMessage)
    if (injectionAnalysis.isBlocked) {
      const refusal = injectionAnalysis.refusalMessage || 'Permintaan ditolak oleh filter keamanan.'
      
      // Log blocked injection attempts for audit trail
      try {
        await supabase.from('chat_logs').insert({
          user_id: user.id,
          message: userMessage,
          response: `[BLOCKED_BY_GUARDRAIL] ${refusal}`,
        })
      } catch (logErr) {
        console.warn('Logging blocked injection failed:', logErr)
      }

      return NextResponse.json({
        data: {
          id: null,
          response: refusal,
          sumber: [],
          dari_kb: false,
          answer_mode: 'blocked',
          security: {
            status: 'blocked',
            risk_level: injectionAnalysis.riskLevel,
            reason: 'prompt_injection_detected',
          },
        },
        reply: refusal,
        response: refusal,
        sumber: [],
        dari_kb: false,
        answer_mode: 'blocked',
        chat_id: null,
        error: null,
      })
    }

    // -------------------------------------------------------------------------
    // Retrieval (Ambil konteks dari knowledge_entries)
    // -------------------------------------------------------------------------
    const STOPWORDS = new Set([
      'dan', 'di', 'ke', 'dari', 'yang', 'ini', 'itu', 'pada', 'untuk', 'dengan',
      'adalah', 'sebagai', 'cara', 'membuat', 'resep', 'rumah', 'bagaimana', 'apa',
      'apakah', 'kapan', 'dimana', 'siapa', 'mengapa', 'kenapa', 'bisa', 'harus',
      'saya', 'kamu', 'anda', 'kita', 'mereka', 'tolong', 'jelaskan', 'tentang',
      'halo', 'selamat', 'pagi', 'siang', 'sore', 'malam', 'ya', 'tidak', 'dong',
      'awal', 'akhir', 'buka', 'usaha', 'modal', 'kiloan', 'berapa', 'mana', 'lebih',
      'sangat', 'baik', 'punya', 'ada', 'lagi', 'saja', 'juga', 'akan', 'sudah',
      'oleh', 'atas', 'bawah', 'saat', 'dalam', 'luar', 'lain', 'kami',
      'gejala', 'penyakit', 'bawang', 'merah', 'jenis', 'daerah', 'wilayah', 'ciri'
    ])

    const meaningfulWords = [...new Set(userMessage.toLowerCase().match(/[a-z0-9]{3,}/g) || [])]
      .filter(word => !STOPWORDS.has(word))

    const retrievedDocs = new Map<string, KnowledgeEntryMatch>()
    let retrievalFailed = false

    function collect(result: { data: KnowledgeEntryMatch[] | null; error: unknown }, partial = false) {
      if (result.error) {
        retrievalFailed = true
        return
      }

      for (const doc of result.data ?? []) {
        if (retrievedDocs.size >= 3) break
        if (partial) {
          // A generic match such as "tanah" cannot answer a location-specific question on its own.
          const terms = new Set([doc.title, doc.summary, doc.content, ...(doc.keywords ?? [])]
            .join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])
          if (!meaningfulWords.every(word => terms.has(word))) continue
        }
        if (!retrievedDocs.has(doc.doc_id)) retrievedDocs.set(doc.doc_id, doc)
      }
    }

    if (meaningfulWords.length) {
      const query = () => supabase.from('knowledge_entries').select('doc_id, title, summary, content, keywords').eq('status', 'published')
      try {
        collect(await query().textSearch('content', meaningfulWords.join(' '), { type: 'plain', config: 'simple' }).limit(3))
        if (retrievedDocs.size < 3) collect(await query().overlaps('keywords', meaningfulWords).limit(12), true)
        if (!retrievedDocs.size) {
          for (const word of meaningfulWords.slice(0, 3)) {
            collect(await query().or(`title.ilike.%${word}%,topic.ilike.%${word}%`).limit(6), true)
            if (retrievedDocs.size >= 3) break
          }
        }
      } catch {
        retrievalFailed = true
      }
    }

    const finalDocs = [...retrievedDocs.values()]
    const firstDoc = finalDocs[0]
    let rawAiResponse: string
    let answerMode: ChatAnswerMode
    if (!firstDoc) {
      answerMode = retrievalFailed ? 'retrieval_unavailable' : 'no_reference'
      rawAiResponse = retrievalFailed
        ? translate('Pencarian di Knowledge Base sedang terganggu. Silakan coba lagi.', language)
        : translate('SIMA belum menemukan rujukan yang sesuai di Knowledge Base. Coba perjelas gejala, varietas, atau kondisi lahan yang ingin ditanyakan.', language)
    } else {
      answerMode = 'fallback'
      rawAiResponse = firstDoc.summary?.trim() || firstDoc.content.slice(0, 500)
      const apiKey = process.env.GEMINI_API_KEY
      if (apiKey) {
        const context = finalDocs.map(doc => [
          `--- DOKUMEN: [${doc.doc_id}] ${doc.title} ---`,
          `RINGKASAN: ${doc.summary || '-'}`,
          `ISI PENGETAHUAN:\n${doc.content.slice(0, 3500)}`,
        ].join('\n')).join('\n\n')
        const weather = 'Kabupaten Nganjuk, Jawa Timur. Iklim tropis monsun dengan suhu rata-rata 25-32°C, kelembaban udara 65-85%, sentra utama budidaya bawang merah dataran rendah (6-80 mdpl).'
        const systemPrompt = buildSecureSystemPrompt(context, weather, injectionAnalysis.riskLevel) + chatLanguageInstruction(language)
        const genAI = new GoogleGenerativeAI(apiKey)
        const candidateModels = [
          'gemini-3.5-flash-lite',
          'gemini-3.1-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3.8-flash',
          'gemini-3.6-flash',
          'gemini-3.7-flash',
        ]

        for (const modelName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent({
              contents: [{ role: 'user', parts: [{ text: encapsulateUserPrompt(userMessage) }] }],
              systemInstruction: systemPrompt,
            })
            const reply = result.response.text()?.trim()
            if (reply) {
              rawAiResponse = reply
              answerMode = 'generated'
              break
            }
          } catch {
            console.warn(`SIMA: model ${modelName} tidak menghasilkan jawaban.`)
          }
        }
      }
    }

    const referenceDocs = answerMode === 'fallback' ? finalDocs.slice(0, 1) : finalDocs
    const sumber = referenceDocs.map(({ doc_id, title }) => ({ doc_id, title }))
    const dariKb = sumber.length > 0

    // -------------------------------------------------------------------------
    // LAYER 5: OUTPUT SECURITY & SENSITIVE INFORMATION REDACTION
    // -------------------------------------------------------------------------
    const outputSecurity = sanitizeAiOutput(rawAiResponse)
    const finalAiResponse = outputSecurity.sanitizedOutput

    // -------------------------------------------------------------------------
    // Logging (Simpan ke chat_logs)
    // -------------------------------------------------------------------------
    let logId: string | null = null
    try {
      const { data: logData, error: logError } = await supabase
        .from('chat_logs')
        .insert({
          user_id: user.id,
          message: userMessage,
          response: finalAiResponse,
        })
        .select('id')
        .single()

      if (!logError && logData) {
        logId = logData.id
      }
    } catch (logErr) {
      console.warn('Logging to chat_logs skipped or failed:', logErr)
    }

    return NextResponse.json({
      data: {
        id: logId,
        response: finalAiResponse,
        sumber: sumber,
        dari_kb: dariKb,
        answer_mode: answerMode,
        security: {
          status: 'cleared',
          risk_level: injectionAnalysis.riskLevel,
          redacted: outputSecurity.redactedCount > 0,
        },
      },
      reply: finalAiResponse,
      response: finalAiResponse,
      sumber: sumber,
      dari_kb: dariKb,
      answer_mode: answerMode,
      chat_id: logId,
      error: null,
    })
  } catch (error: unknown) {
    console.error('API /api/chat error:', error)
    return NextResponse.json(
      { data: null, error: { message: 'Terjadi kesalahan internal server', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
