'use client'

import { useLanguage } from '@/components/ui/LanguageProvider'
import type { ChatAnswerMode, ChatSource } from '@/lib/chat/response'

export function ChatAnswerDetails({ mode, sources }: { mode?: ChatAnswerMode; sources?: ChatSource[] }) {
  const { t } = useLanguage()

  if (!sources?.length) return null

  return (
    <div className="mb-3 space-y-2 rounded-xl border border-[var(--theme-line)] p-3 text-xs leading-relaxed text-[var(--theme-body)]">
      {mode === 'fallback' && (
        <p>{t('Jawaban cadangan. SIMA menampilkan ringkasan rujukan karena layanan AI sedang tidak tersedia.')}</p>
      )}
      <p className="font-semibold text-[var(--theme-ink)]">{t('Rujukan Knowledge Base')}</p>
      <ul className="list-disc space-y-1 pl-4">
        {sources.map(source => (
          <li key={source.doc_id} className="[overflow-wrap:anywhere]">{source.title}</li>
        ))}
      </ul>
    </div>
  )
}
