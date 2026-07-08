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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_snapshots: {
        Row: {
          generated_at: string
          id: string
          metrics: Json
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
        }
        Insert: {
          generated_at?: string
          id?: string
          metrics: Json
          organization_id: string
          period_end: string
          period_start: string
          period_type: string
        }
        Update: {
          generated_at?: string
          id?: string
          metrics?: Json
          organization_id?: string
          period_end?: string
          period_start?: string
          period_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          chat_session_id: string | null
          confirmed_at: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          patient_id: string
          qualification_summary: Json | null
          scheduled_end: string
          scheduled_start: string
          service_id: string
          source: string
          status: string
          therapist_id: string
          updated_at: string
        }
        Insert: {
          chat_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          patient_id: string
          qualification_summary?: Json | null
          scheduled_end: string
          scheduled_start: string
          service_id: string
          source?: string
          status?: string
          therapist_id: string
          updated_at?: string
        }
        Update: {
          chat_session_id?: string | null
          confirmed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          patient_id?: string
          qualification_summary?: Json | null
          scheduled_end?: string
          scheduled_start?: string
          service_id?: string
          source?: string
          status?: string
          therapist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      approved_resources: {
        Row: {
          active: boolean
          approved_by: string | null
          body_region: string
          condition: string | null
          created_at: string
          deleted_at: string | null
          id: string
          organization_id: string | null
          title: string
          type: string
          url: string
        }
        Insert: {
          active?: boolean
          approved_by?: string | null
          body_region: string
          condition?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string | null
          title: string
          type: string
          url: string
        }
        Update: {
          active?: boolean
          approved_by?: string | null
          body_region?: string
          condition?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          organization_id?: string | null
          title?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_resources_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approved_resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip_address: unknown
          organization_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_type: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: unknown
          organization_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: unknown
          organization_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          ended_at: string | null
          id: string
          organization_id: string
          outcome: string | null
          patient_id: string | null
          presenting_body_region: string | null
          presenting_complaint: string | null
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          organization_id: string
          outcome?: string | null
          patient_id?: string | null
          presenting_body_region?: string | null
          presenting_complaint?: string | null
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          organization_id?: string
          outcome?: string | null
          patient_id?: string | null
          presenting_body_region?: string | null
          presenting_complaint?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_settings: {
        Row: {
          address: string | null
          booking_horizon_days: number
          booking_lead_time_minutes: number
          brand_color_primary: string | null
          brand_color_secondary: string | null
          city: string | null
          country: string | null
          created_at: string
          emergency_contact_number: string | null
          logo_url: string | null
          opening_hours: Json
          organization_id: string
          timezone: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          booking_horizon_days?: number
          booking_lead_time_minutes?: number
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          emergency_contact_number?: string | null
          logo_url?: string | null
          opening_hours?: Json
          organization_id: string
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          booking_horizon_days?: number
          booking_lead_time_minutes?: number
          brand_color_primary?: string | null
          brand_color_secondary?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          emergency_contact_number?: string | null
          logo_url?: string | null
          opening_hours?: Json
          organization_id?: string
          timezone?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          organization_id: string
          priority: string
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          organization_id: string
          priority?: string
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_document_versions: {
        Row: {
          content: string
          content_type: string
          created_at: string
          edited_by: string | null
          embedding: string | null
          id: string
          knowledge_document_id: string
          organization_id: string
          version_number: number
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          edited_by?: string | null
          embedding?: string | null
          id?: string
          knowledge_document_id: string
          organization_id: string
          version_number: number
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          edited_by?: string | null
          embedding?: string | null
          id?: string
          knowledge_document_id?: string
          organization_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_document_versions_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_document_versions_knowledge_document_id_fkey"
            columns: ["knowledge_document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          active: boolean
          content: string
          content_type: string
          created_at: string
          deleted_at: string | null
          embedding: string | null
          embedding_model: string | null
          id: string
          language: string
          organization_id: string
          source_type: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          content_type: string
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          language?: string
          organization_id: string
          source_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          content_type?: string
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          id?: string
          language?: string
          organization_id?: string
          source_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_session_id: string
          content: string
          created_at: string
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          chat_session_id: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
          role: string
        }
        Update: {
          chat_session_id?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_session_id_fkey"
            columns: ["chat_session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ai_settings: {
        Row: {
          ai_capabilities: Json
          ai_profile: string | null
          assistant_avatar_url: string | null
          assistant_name: string
          booking_preferences: Json
          booking_style: string
          brand_voice: string | null
          clinic_description: string | null
          created_at: string
          default_cta: string | null
          fallback_message: string | null
          follow_up_days: number | null
          follow_up_enabled: boolean
          organization_id: string
          show_disclaimer: boolean
          specialties: string[]
          supported_languages: string[]
          tone: string
          updated_at: string
          verbosity: string
          welcome_message: string | null
        }
        Insert: {
          ai_capabilities?: Json
          ai_profile?: string | null
          assistant_avatar_url?: string | null
          assistant_name?: string
          booking_preferences?: Json
          booking_style?: string
          brand_voice?: string | null
          clinic_description?: string | null
          created_at?: string
          default_cta?: string | null
          fallback_message?: string | null
          follow_up_days?: number | null
          follow_up_enabled?: boolean
          organization_id: string
          show_disclaimer?: boolean
          specialties?: string[]
          supported_languages?: string[]
          tone?: string
          updated_at?: string
          verbosity?: string
          welcome_message?: string | null
        }
        Update: {
          ai_capabilities?: Json
          ai_profile?: string | null
          assistant_avatar_url?: string | null
          assistant_name?: string
          booking_preferences?: Json
          booking_style?: string
          brand_voice?: string | null
          clinic_description?: string | null
          created_at?: string
          default_cta?: string | null
          fallback_message?: string | null
          follow_up_days?: number | null
          follow_up_enabled?: boolean
          organization_id?: string
          show_disclaimer?: boolean
          specialties?: string[]
          supported_languages?: string[]
          tone?: string
          updated_at?: string
          verbosity?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_status: string | null
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          plan: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          billing_status?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          billing_status?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          anonymized_at: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          name: string
          organization_id: string
          price_amount_minor: number
          price_currency: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          name: string
          organization_id: string
          price_amount_minor: number
          price_currency: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          organization_id?: string
          price_amount_minor?: number
          price_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      therapist_availability: {
        Row: {
          created_at: string
          day_of_week: number | null
          end_time: string
          id: string
          is_blocked: boolean
          organization_id: string
          specific_date: string | null
          start_time: string
          therapist_id: string
        }
        Insert: {
          created_at?: string
          day_of_week?: number | null
          end_time: string
          id?: string
          is_blocked?: boolean
          organization_id: string
          specific_date?: string | null
          start_time: string
          therapist_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_blocked?: boolean
          organization_id?: string
          specific_date?: string | null
          start_time?: string
          therapist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "therapist_availability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapist_availability_therapist_id_fkey"
            columns: ["therapist_id"]
            isOneToOne: false
            referencedRelation: "therapists"
            referencedColumns: ["id"]
          },
        ]
      }
      therapists: {
        Row: {
          active: boolean
          bio: string | null
          created_at: string
          credentials: string | null
          deleted_at: string | null
          display_name: string
          id: string
          organization_id: string
          photo_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          created_at?: string
          credentials?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          organization_id: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          created_at?: string
          credentials?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          organization_id?: string
          photo_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "therapists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      onboard_organization: {
        Args: {
          p_city?: string
          p_clinic_name: string
          p_country?: string
          p_full_name: string
          p_timezone?: string
          p_whatsapp?: string
        }
        Returns: Json
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
