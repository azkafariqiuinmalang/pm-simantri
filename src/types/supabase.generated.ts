export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chat_logs: {
        Row: {
          created_at: string
          feedback: string | null
          feedback_note: string | null
          id: string
          message: string
          response: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          feedback_note?: string | null
          id?: string
          message: string
          response: string
          user_id: string
        }
        Update: {
          created_at?: string
          feedback?: string | null
          feedback_note?: string | null
          id?: string
          message?: string
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_listings: {
        Row: {
          contact: string
          created_at: string
          description: string
          harvest_date: string | null
          id: string
          image_paths: string[]
          location: string
          price_per_kg: number
          quantity_kg: number
          seller_id: string
          status: string
          title: string
          updated_at: string
          variety: string | null
        }
        Insert: {
          contact: string
          created_at?: string
          description?: string
          harvest_date?: string | null
          id?: string
          image_paths?: string[]
          location: string
          price_per_kg: number
          quantity_kg: number
          seller_id: string
          status?: string
          title: string
          updated_at?: string
          variety?: string | null
        }
        Update: {
          contact?: string
          created_at?: string
          description?: string
          harvest_date?: string | null
          id?: string
          image_paths?: string[]
          location?: string
          price_per_kg?: number
          quantity_kg?: number
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "harvest_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string
          doc_id: string
          entity_type: string | null
          evidence_level: string | null
          id: string
          image_urls: string[]
          keywords: string[]
          location: string | null
          metadata: Json
          recommended_month: string[]
          recommended_season: string | null
          related_diseases: string[]
          related_pests: string[]
          related_varieties: string[]
          related_weather: string[]
          review_status: string | null
          semantic_keywords: string[]
          source_title: string | null
          source_url: string | null
          status: string
          subcategory: string | null
          summary: string
          synonyms: string[]
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string
          doc_id: string
          entity_type?: string | null
          evidence_level?: string | null
          id?: string
          image_urls?: string[]
          keywords?: string[]
          location?: string | null
          metadata?: Json
          recommended_month?: string[]
          recommended_season?: string | null
          related_diseases?: string[]
          related_pests?: string[]
          related_varieties?: string[]
          related_weather?: string[]
          review_status?: string | null
          semantic_keywords?: string[]
          source_title?: string | null
          source_url?: string | null
          status?: string
          subcategory?: string | null
          summary?: string
          synonyms?: string[]
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string
          doc_id?: string
          entity_type?: string | null
          evidence_level?: string | null
          id?: string
          image_urls?: string[]
          keywords?: string[]
          location?: string | null
          metadata?: Json
          recommended_month?: string[]
          recommended_season?: string | null
          related_diseases?: string[]
          related_pests?: string[]
          related_varieties?: string[]
          related_weather?: string[]
          review_status?: string | null
          semantic_keywords?: string[]
          source_title?: string | null
          source_url?: string | null
          status?: string
          subcategory?: string | null
          summary?: string
          synonyms?: string[]
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_price: {
        Row: {
          created_at: string
          harga: number
          id: string
          input_by: string | null
          region_name: string
          source: string
          source_url: string | null
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga: number
          id?: string
          input_by?: string | null
          region_name?: string
          source?: string
          source_url?: string | null
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga?: number
          id?: string
          input_by?: string | null
          region_name?: string
          source?: string
          source_url?: string | null
          tanggal?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_price_input_by_fkey"
            columns: ["input_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_regional_price: {
        Row: {
          created_at: string
          harga: number
          harga_diff: string
          id: string
          komoditas: string
          percentage: number | null
          price_type: number
          prov_id: number
          provinsi: string
          semua_provinsi: number | null
          source_url: string
          tanggal: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          harga: number
          harga_diff?: string
          id?: string
          komoditas?: string
          percentage?: number | null
          price_type?: number
          prov_id: number
          provinsi: string
          semua_provinsi?: number | null
          source_url?: string
          tanggal: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          harga?: number
          harga_diff?: string
          id?: string
          komoditas?: string
          percentage?: number | null
          price_type?: number
          prov_id?: number
          provinsi?: string
          semua_provinsi?: number | null
          source_url?: string
          tanggal?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
          village: string | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
          village?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
          village?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      prune_expired_market_prices: {
        Args: { [_ in never]: never }
        Returns: Json
      }
      upsert_scraped_market_price: {
        Args: {
          p_harga: number
          p_input_by?: string
          p_source?: string
          p_tanggal: string
        }
        Returns: undefined
      }
      upsert_scraped_regional_price: {
        Args: { p_records: Json }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
