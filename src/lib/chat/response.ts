export type ChatAnswerMode = 'generated' | 'fallback' | 'no_reference' | 'retrieval_unavailable' | 'blocked'

export interface ChatSource {
  doc_id: string
  title: string
}
