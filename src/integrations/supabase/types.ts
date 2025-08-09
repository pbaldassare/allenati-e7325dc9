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
      achievements: {
        Row: {
          badge_color: string | null
          created_at: string
          criteria: Json | null
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
          points_reward: number
        }
        Insert: {
          badge_color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_reward?: number
        }
        Update: {
          badge_color?: string | null
          created_at?: string
          criteria?: Json | null
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_reward?: number
        }
        Relationships: []
      }
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
        ]
      }
      course_categories: {
        Row: {
          color_hex: string | null
          created_at: string
          description: string | null
          icon_name: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          color_hex?: string | null
          created_at?: string
          description?: string | null
          icon_name?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      course_schedules: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
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
      courses: {
        Row: {
          benefits: string[] | null
          category_id: string
          created_at: string
          credits_required: number
          description: string | null
          difficulty_level: number | null
          duration_minutes: number
          equipment_needed: string[] | null
          id: string
          image_url: string | null
          instructor_id: string
          is_active: boolean
          max_participants: number
          name: string
          price_per_session: number | null
          requirements: string[] | null
          updated_at: string
        }
        Insert: {
          benefits?: string[] | null
          category_id: string
          created_at?: string
          credits_required?: number
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number
          equipment_needed?: string[] | null
          id?: string
          image_url?: string | null
          instructor_id: string
          is_active?: boolean
          max_participants?: number
          name: string
          price_per_session?: number | null
          requirements?: string[] | null
          updated_at?: string
        }
        Update: {
          benefits?: string[] | null
          category_id?: string
          created_at?: string
          credits_required?: number
          description?: string | null
          difficulty_level?: number | null
          duration_minutes?: number
          equipment_needed?: string[] | null
          id?: string
          image_url?: string | null
          instructor_id?: string
          is_active?: boolean
          max_participants?: number
          name?: string
          price_per_session?: number | null
          requirements?: string[] | null
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
      instructors: {
        Row: {
          bio: string | null
          certifications: string[] | null
          created_at: string
          experience_years: number | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          specializations: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          specializations?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          experience_years?: number | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          specializations?: string[] | null
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
          bio: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          first_name: string
          fiscal_code: string | null
          gender: string | null
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          postal_code: string | null
          profile_picture_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name: string
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          postal_code?: string | null
          profile_picture_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          first_name?: string
          fiscal_code?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
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
          id?: string
          is_active?: boolean
          is_trial?: boolean
          name?: string
          price?: number
          unlimited_access?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          points_earned: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          points_earned?: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
          id?: string
          plan_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_backoffice_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      access_level: "backoffice" | "mobile" | "both"
      app_role:
        | "super_admin"
        | "admin"
        | "instructor"
        | "staff"
        | "premium_user"
        | "basic_user"
      booking_status:
        | "confirmed"
        | "waitlist"
        | "cancelled"
        | "completed"
        | "no_show"
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
      app_role: [
        "super_admin",
        "admin",
        "instructor",
        "staff",
        "premium_user",
        "basic_user",
      ],
      booking_status: [
        "confirmed",
        "waitlist",
        "cancelled",
        "completed",
        "no_show",
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
