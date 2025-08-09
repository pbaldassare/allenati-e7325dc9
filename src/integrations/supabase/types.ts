export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      crawled_pages: {
        Row: {
          content: string | null
          crawled_at: string
          id: string
          metadata: Json | null
          project_id: string | null
          session_id: string
          title: string | null
          url: string
        }
        Insert: {
          content?: string | null
          crawled_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          session_id: string
          title?: string | null
          url: string
        }
        Update: {
          content?: string | null
          crawled_at?: string
          id?: string
          metadata?: Json | null
          project_id?: string | null
          session_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawled_pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "scraping_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_code: {
        Row: {
          code: string
          code_type: string
          description: string | null
          generated_at: string
          id: string
          project_id: string | null
        }
        Insert: {
          code: string
          code_type: string
          description?: string | null
          generated_at?: string
          id?: string
          project_id?: string | null
        }
        Update: {
          code?: string
          code_type?: string
          description?: string | null
          generated_at?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_code_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "scraping_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scraped_data: {
        Row: {
          fields: Json | null
          id: string
          markdown: string | null
          project_id: string | null
          raw_html: string | null
          scraped_at: string
          title: string | null
          url: string
        }
        Insert: {
          fields?: Json | null
          id?: string
          markdown?: string | null
          project_id?: string | null
          raw_html?: string | null
          scraped_at?: string
          title?: string | null
          url: string
        }
        Update: {
          fields?: Json | null
          id?: string
          markdown?: string | null
          project_id?: string | null
          raw_html?: string | null
          scraped_at?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraped_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "scraping_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_projects: {
        Row: {
          auth_config: Json | null
          crawl_options: Json | null
          created_at: string
          id: string
          name: string
          updated_at: string
          url: string
        }
        Insert: {
          auth_config?: Json | null
          crawl_options?: Json | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          url: string
        }
        Update: {
          auth_config?: Json | null
          crawl_options?: Json | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
