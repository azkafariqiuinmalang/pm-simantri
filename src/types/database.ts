export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'petani' | 'admin'
export type EntryStatus = 'draft' | 'published'
export type PriceSource = 'manual' | 'scraping'
export type ChatFeedbackValue = 'helpful' | 'not_helpful'
export interface Profile {
  id: string
  full_name: string
  role: UserRole
  village: string | null
  created_at: string
  updated_at?: string
}

export interface KnowledgeEntry {
  id: string
  doc_id: string
  title: string
  category: string
  subcategory: string | null
  topic: string | null
  summary: string
  content: string
  keywords: string[]
  semantic_keywords: string[]
  synonyms: string[]
  entity_type: string | null
  location: string | null
  recommended_month: string[]
  recommended_season: string | null
  related_varieties: string[]
  related_diseases: string[]
  related_pests: string[]
  related_weather: string[]
  evidence_level: string | null
  review_status: string | null
  status: EntryStatus
  author_id: string
  based_on_suggestion_id: string | null
  created_at: string
  updated_at: string
}

export interface MarketPrice {
  id: string
  tanggal: string
  harga: number
  source: PriceSource
  input_by: string | null
  created_at: string
}

export interface ChatLog {
  id: string
  user_id: string | null
  message: string
  response: string
  feedback: ChatFeedbackValue | null
  feedback_note: string | null
  created_at: string
}
