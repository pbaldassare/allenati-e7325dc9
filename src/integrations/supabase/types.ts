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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_action_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      app_content: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          key: string
          link_url: string | null
          target_audience: string[] | null
          title: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          key: string
          link_url?: string | null
          target_audience?: string[] | null
          title?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          key?: string
          link_url?: string | null
          target_audience?: string[] | null
          title?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      booking_history: {
        Row: {
          booking_id: string
          change_reason: string | null
          changed_by: string | null
          created_at: string
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["booking_status"]
          old_status: Database["public"]["Enums"]["booking_status"] | null
        }
        Insert: {
          booking_id: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["booking_status"]
          old_status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Update: {
          booking_id?: string
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["booking_status"]
          old_status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          checked_in_at: string | null
          course_id: string
          created_at: string
          credits_used: number
          id: string
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          session_id: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          course_id: string
          created_at?: string
          credits_used?: number
          id?: string
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          checked_in_at?: string | null
          course_id?: string
          created_at?: string
          credits_used?: number
          id?: string
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_user_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean
          message_type: string
          metadata: Json | null
          room_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          message_type?: string
          metadata?: Json | null
          room_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean
          message_type?: string
          metadata?: Json | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          last_read_at: string | null
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          description: string | null
          gym_id: string | null
          id: string
          is_active: boolean
          name: string
          room_type: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          room_type: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          room_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      course_categories: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          gym_id: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          gym_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          gym_id?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_categories_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedule_exceptions: {
        Row: {
          course_id: string
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedule_exceptions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedules: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          room_id: string | null
          room_name: string | null
          start_time: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          room_id?: string | null
          room_name?: string | null
          start_time: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          room_id?: string | null
          room_name?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          available_spots: number
          course_id: string
          created_at: string
          end_time: string
          id: string
          max_participants: number
          notes: string | null
          room_id: string | null
          room_name: string | null
          session_date: string
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          available_spots?: number
          course_id: string
          created_at?: string
          end_time: string
          id?: string
          max_participants?: number
          notes?: string | null
          room_id?: string | null
          room_name?: string | null
          session_date: string
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          available_spots?: number
          course_id?: string
          created_at?: string
          end_time?: string
          id?: string
          max_participants?: number
          notes?: string | null
          room_id?: string | null
          room_name?: string | null
          session_date?: string
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "gym_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          auto_generate_sessions: boolean
          benefits: string[] | null
          category_id: string
          created_at: string
          credits_required: number
          deadline_hours: number | null
          description: string | null
          difficulty_level: number | null
          duration_minutes: number
          end_date: string | null
          equipment_needed: string[] | null
          gym_id: string | null
          id: string
          image_url: string | null
          instructor_id: string
          is_active: boolean
          max_participants: number
          name: string
          price_per_session: number | null
          requirements: string[] | null
          reserved_spots: number
          start_date: string | null
          updated_at: string
        }
        Insert: {
          auto_generate_sessions?: boolean
          benefits?: string[] | null
          category_id: string
          created_at?: string
          credits_required?: number
          deadline_hours?: number | null
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number
          end_date?: string | null
          equipment_needed?: string[] | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          instructor_id: string
          is_active?: boolean
          max_participants?: number
          name: string
          price_per_session?: number | null
          requirements?: string[] | null
          reserved_spots?: number
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          auto_generate_sessions?: boolean
          benefits?: string[] | null
          category_id?: string
          created_at?: string
          credits_required?: number
          deadline_hours?: number | null
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number
          end_date?: string | null
          equipment_needed?: string[] | null
          gym_id?: string | null
          id?: string
          image_url?: string | null
          instructor_id?: string
          is_active?: boolean
          max_participants?: number
          name?: string
          price_per_session?: number | null
          requirements?: string[] | null
          reserved_spots?: number
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "course_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          gym_id: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          gym_id?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          gym_id?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_transactions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_reports: {
        Row: {
          active_users: number | null
          data: Json | null
          generated_at: string
          generated_by: string | null
          id: string
          new_subscribers: number | null
          period_end: string
          period_start: string
          report_type: string
          total_bookings: number | null
          total_revenue: number | null
        }
        Insert: {
          active_users?: number | null
          data?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          new_subscribers?: number | null
          period_end: string
          period_start: string
          report_type: string
          total_bookings?: number | null
          total_revenue?: number | null
        }
        Update: {
          active_users?: number | null
          data?: Json | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          new_subscribers?: number | null
          period_end?: string
          period_start?: string
          report_type?: string
          total_bookings?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      gym_applications: {
        Row: {
          applicant_email: string | null
          applicant_message: string | null
          applicant_user_id: string | null
          created_at: string
          gym_address: string
          gym_city: string
          gym_description: string | null
          gym_email: string | null
          gym_name: string
          gym_phone: string | null
          gym_postal_code: string | null
          gym_website: string | null
          id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_email?: string | null
          applicant_message?: string | null
          applicant_user_id?: string | null
          created_at?: string
          gym_address: string
          gym_city: string
          gym_description?: string | null
          gym_email?: string | null
          gym_name: string
          gym_phone?: string | null
          gym_postal_code?: string | null
          gym_website?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_email?: string | null
          applicant_message?: string | null
          applicant_user_id?: string | null
          created_at?: string
          gym_address?: string
          gym_city?: string
          gym_description?: string | null
          gym_email?: string | null
          gym_name?: string
          gym_phone?: string | null
          gym_postal_code?: string | null
          gym_website?: string | null
          id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gym_credits: {
        Row: {
          created_at: string
          credits: number
          gym_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number
          gym_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          gym_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_credits_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_join_requests: {
        Row: {
          created_at: string
          gym_id: string
          id: string
          message: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gym_id: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gym_id?: string
          id?: string
          message?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_join_requests_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_rooms: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          gym_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          gym_id: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          gym_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gyms: {
        Row: {
          address: string
          business_name: string | null
          city: string
          codice_fiscale: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_email: string | null
          partita_iva: string | null
          phone: string | null
          postal_code: string | null
          stripe_credentials_configured: boolean | null
          stripe_publishable_key: string | null
          stripe_secret_key: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address: string
          business_name?: string | null
          city: string
          codice_fiscale?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_email?: string | null
          partita_iva?: string | null
          phone?: string | null
          postal_code?: string | null
          stripe_credentials_configured?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string
          business_name?: string | null
          city?: string
          codice_fiscale?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_email?: string | null
          partita_iva?: string | null
          phone?: string | null
          postal_code?: string | null
          stripe_credentials_configured?: boolean | null
          stripe_publishable_key?: string | null
          stripe_secret_key?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          experience_years: number | null
          first_name: string | null
          gym_id: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string | null
          specializations: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          first_name?: string | null
          gym_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          first_name?: string | null
          gym_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          specializations?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructors_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_certificates: {
        Row: {
          created_at: string
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          gym_id: string
          id: string
          issue_date: string | null
          notes: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["medical_certificate_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          gym_id: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["medical_certificate_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          gym_id?: string
          id?: string
          issue_date?: string | null
          notes?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["medical_certificate_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mobile_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          push_token: string | null
          read_at: string | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          push_token?: string | null
          read_at?: string | null
          sent_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          push_token?: string | null
          read_at?: string | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          payment_id: string | null
          shipping_address: Json | null
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          payment_id?: string | null
          shipping_address?: Json | null
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          processed_at: string | null
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          processed_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          access_level: Database["public"]["Enums"]["access_level"]
          action: string
          created_at: string
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          access_level?: Database["public"]["Enums"]["access_level"]
          action: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          access_level?: Database["public"]["Enums"]["access_level"]
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      points_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_digital: boolean | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_digital?: boolean | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_digital?: boolean | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          belt: Database["public"]["Enums"]["belt_level"] | null
          bio: string | null
          city: string | null
          created_at: string
          current_credits: number | null
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string | null
          fiscal_code: string | null
          gender: string | null
          id: string
          is_active: boolean
          last_name: string | null
          nickname: string | null
          phone: string | null
          postal_code: string | null
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          belt?: Database["public"]["Enums"]["belt_level"] | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_credits?: number | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          belt?: Database["public"]["Enums"]["belt_level"] | null
          bio?: string | null
          city?: string | null
          created_at?: string
          current_credits?: number | null
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string | null
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          nickname?: string | null
          phone?: string | null
          postal_code?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          id?: string
          permission_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          id?: string
          permission_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_cart: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_cart_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_schedules: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          end_time: string
          id: string
          notes: string | null
          role: string | null
          staff_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          notes?: string | null
          role?: string | null
          staff_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          role?: string | null
          staff_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          credits_included: number
          description: string | null
          duration_days: number
          features: string[] | null
          gym_id: string | null
          id: string
          is_active: boolean
          is_trial: boolean
          name: string
          price: number
          unlimited_access: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits_included?: number
          description?: string | null
          duration_days: number
          features?: string[] | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          name: string
          price: number
          unlimited_access?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits_included?: number
          description?: string | null
          duration_days?: number
          features?: string[] | null
          gym_id?: string | null
          id?: string
          is_active?: boolean
          is_trial?: boolean
          name?: string
          price?: number
          unlimited_access?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_plans_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_tracking: {
        Row: {
          activity_type: string
          id: string
          metadata: Json | null
          session_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          activity_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gym_memberships: {
        Row: {
          created_at: string
          expires_at: string | null
          gym_id: string
          id: string
          joined_at: string
          membership_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          gym_id: string
          id?: string
          joined_at?: string
          membership_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          gym_id?: string
          id?: string
          joined_at?: string
          membership_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_checkin: boolean | null
          favorite_courses: string[] | null
          favorite_instructors: string[] | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          push_bookings: boolean | null
          push_promotions: boolean | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_checkin?: boolean | null
          favorite_courses?: string[] | null
          favorite_instructors?: string[] | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_bookings?: boolean | null
          push_promotions?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_checkin?: boolean | null
          favorite_courses?: string[] | null
          favorite_instructors?: string[] | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_bookings?: boolean | null
          push_promotions?: boolean | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          expires_at: string
          gym_id: string | null
          id: string
          plan_id: string
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          expires_at: string
          gym_id?: string | null
          id?: string
          plan_id: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          expires_at?: string
          gym_id?: string | null
          id?: string
          plan_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_default_rooms_to_gym: {
        Args: { _gym_id: string }
        Returns: undefined
      }
      can_book_within_deadline: {
        Args: { _course_id: string; _scheduled_datetime: string }
        Returns: boolean
      }
      can_manage_booking_without_deadline: {
        Args: { _user_id: string }
        Returns: boolean
      }
      cleanup_expired_reset_tokens: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_course_chat: {
        Args: { _course_id: string; _course_name: string; _created_by: string }
        Returns: string
      }
      create_gym_general_chat: {
        Args: { _created_by: string; _gym_id: string }
        Returns: string
      }
      debug_user_permissions: {
        Args: { _user_id: string }
        Returns: Json
      }
      demote_instructor_to_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      generate_course_sessions: {
        Args: { _course_id: string; _end_date: string; _start_date: string }
        Returns: number
      }
      generate_course_sessions_with_exceptions: {
        Args: { _course_id: string; _end_date: string; _start_date: string }
        Returns: number
      }
      get_gym_owner_instructor: {
        Args: { _gym_id: string }
        Returns: string
      }
      get_user_credits_for_gym: {
        Args: { _gym_id: string; _user_id: string }
        Returns: number
      }
      get_user_gym_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_gyms: {
        Args: { _user_id: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_subscription_for_gym: {
        Args: { _gym_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_backoffice_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      manual_enroll_user: {
        Args: { _enrolled_by: string; _session_id: string; _user_id: string }
        Returns: string
      }
      promote_user_to_instructor: {
        Args: { bio?: string; target_user_id: string }
        Returns: string
      }
      user_has_permission: {
        Args: { _permission_name: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "backoffice" | "mobile" | "both"
      app_role: "admin" | "gym_owner" | "instructor" | "basic_user"
      belt_level: "Bianca" | "Blu" | "Viola" | "Marrone" | "Nera"
      booking_status:
        | "confirmed"
        | "waitlist"
        | "cancelled"
        | "completed"
        | "no_show"
      medical_certificate_status:
        | "pending"
        | "approved"
        | "rejected"
        | "expired"
      notification_type:
        | "booking"
        | "payment"
        | "course_update"
        | "achievement"
        | "system"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      subscription_status: "active" | "cancelled" | "expired" | "trial"
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
    Enums: {
      access_level: ["backoffice", "mobile", "both"],
      app_role: ["admin", "gym_owner", "instructor", "basic_user"],
      belt_level: ["Bianca", "Blu", "Viola", "Marrone", "Nera"],
      booking_status: [
        "confirmed",
        "waitlist",
        "cancelled",
        "completed",
        "no_show",
      ],
      medical_certificate_status: [
        "pending",
        "approved",
        "rejected",
        "expired",
      ],
      notification_type: [
        "booking",
        "payment",
        "course_update",
        "achievement",
        "system",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      subscription_status: ["active", "cancelled", "expired", "trial"],
    },
  },
} as const
