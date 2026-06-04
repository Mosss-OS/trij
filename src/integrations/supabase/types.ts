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
  public: {
    Tables: {
      assessments: {
        Row: {
          chw_user_id: string
          condition: string | null
          confidence: number | null
          created_at: string
          follow_up_questions: Json | null
          id: string
          images: string[] | null
          key_visual_features: Json | null
          language: string | null
          patient_id: string
          possible_conditions: Json | null
          recommendation: string | null
          referral_advised: boolean | null
          referral_status: string
          synced_at: string | null
          urgency: string | null
          voice_log: string | null
        }
        Insert: {
          chw_user_id: string
          condition?: string | null
          confidence?: number | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          images?: string[] | null
          key_visual_features?: Json | null
          language?: string | null
          patient_id: string
          possible_conditions?: Json | null
          recommendation?: string | null
          referral_advised?: boolean | null
          referral_status?: string
          synced_at?: string | null
          urgency?: string | null
          voice_log?: string | null
        }
        Update: {
          chw_user_id?: string
          condition?: string | null
          confidence?: number | null
          created_at?: string
          follow_up_questions?: Json | null
          id?: string
          images?: string[] | null
          key_visual_features?: Json | null
          language?: string | null
          patient_id?: string
          possible_conditions?: Json | null
          recommendation?: string | null
          referral_advised?: boolean | null
          referral_status?: string
          synced_at?: string | null
          urgency?: string | null
          voice_log?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      chw_profiles: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          language: string
          last_sync: string | null
          location_lat: number | null
          location_lng: number | null
          name: string
          region: string | null
          supervisor_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          language?: string
          last_sync?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name: string
          region?: string | null
          supervisor_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          language?: string
          last_sync?: string | null
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          region?: string | null
          supervisor_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chw_profiles_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "chw_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consultations: {
        Row: {
          id: string
          patient_id: string
          assessment_id: string | null
          chw_user_id: string
          chw_name: string
          status: string
          priority: string
          images: string[] | null
          voice_transcript: string | null
          chw_notes: string
          clinical_context: Json | null
          response: Json | null
          created_at: string
          responded_at: string | null
          synced_at: string | null
          version: number
        }
        Insert: {
          id?: string
          patient_id: string
          assessment_id?: string | null
          chw_user_id: string
          chw_name: string
          status?: string
          priority?: string
          images?: string[] | null
          voice_transcript?: string | null
          chw_notes?: string
          clinical_context?: Json | null
          response?: Json | null
          created_at?: string
          responded_at?: string | null
          synced_at?: string | null
          version?: number
        }
        Update: {
          id?: string
          patient_id?: string
          assessment_id?: string | null
          chw_user_id?: string
          chw_name?: string
          status?: string
          priority?: string
          images?: string[] | null
          voice_transcript?: string | null
          chw_notes?: string
          clinical_context?: Json | null
          response?: Json | null
          created_at?: string
          responded_at?: string | null
          synced_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          age_years: number | null
          chw_user_id: string
          created_at: string
          id: string
          identifier: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          sex: string | null
          updated_at: string
        }
        Insert: {
          age_years?: number | null
          chw_user_id?: string
          created_at?: string
          id?: string
          identifier: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          sex?: string | null
          updated_at?: string
        }
        Update: {
          age_years?: number | null
          chw_user_id?: string
          created_at?: string
          id?: string
          identifier?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          sex?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "chw" | "supervisor" | "admin"
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
      app_role: ["chw", "supervisor", "admin"],
    },
  },
} as const
