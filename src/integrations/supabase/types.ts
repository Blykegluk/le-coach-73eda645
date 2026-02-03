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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_type: string
          avg_heart_rate: number | null
          calories_burned: number | null
          created_at: string
          distance_km: number | null
          duration_min: number
          id: string
          notes: string | null
          performed_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min: number
          id?: string
          notes?: string | null
          performed_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          avg_heart_rate?: number | null
          calories_burned?: number | null
          created_at?: string
          distance_km?: number | null
          duration_min?: number
          id?: string
          notes?: string | null
          performed_at?: string
          user_id?: string
        }
        Relationships: []
      }
      body_composition: {
        Row: {
          bmi: number | null
          bmr_kcal: number | null
          body_age: number | null
          body_fat_pct: number | null
          bone_mass_kg: number | null
          created_at: string
          fat_mass_kg: number | null
          id: string
          lean_mass_kg: number | null
          measured_at: string
          muscle_mass_kg: number | null
          photo_url: string | null
          protein_kg: number | null
          protein_pct: number | null
          raw_data: Json | null
          skeletal_muscle_pct: number | null
          standard_weight_kg: number | null
          subcutaneous_fat_pct: number | null
          user_id: string
          visceral_fat_index: number | null
          water_pct: number | null
          weight_kg: number | null
        }
        Insert: {
          bmi?: number | null
          bmr_kcal?: number | null
          body_age?: number | null
          body_fat_pct?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          fat_mass_kg?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          muscle_mass_kg?: number | null
          photo_url?: string | null
          protein_kg?: number | null
          protein_pct?: number | null
          raw_data?: Json | null
          skeletal_muscle_pct?: number | null
          standard_weight_kg?: number | null
          subcutaneous_fat_pct?: number | null
          user_id: string
          visceral_fat_index?: number | null
          water_pct?: number | null
          weight_kg?: number | null
        }
        Update: {
          bmi?: number | null
          bmr_kcal?: number | null
          body_age?: number | null
          body_fat_pct?: number | null
          bone_mass_kg?: number | null
          created_at?: string
          fat_mass_kg?: number | null
          id?: string
          lean_mass_kg?: number | null
          measured_at?: string
          muscle_mass_kg?: number | null
          photo_url?: string | null
          protein_kg?: number | null
          protein_pct?: number | null
          raw_data?: Json | null
          skeletal_muscle_pct?: number | null
          standard_weight_kg?: number | null
          subcutaneous_fat_pct?: number | null
          user_id?: string
          visceral_fat_index?: number | null
          water_pct?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_metrics: {
        Row: {
          active_minutes: number | null
          body_fat_pct: number | null
          calories_burned: number | null
          calories_in: number | null
          created_at: string
          date: string
          floors_climbed: number | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          heart_rate_resting: number | null
          id: string
          sleep_hours: number | null
          steps: number | null
          updated_at: string
          user_id: string
          water_ml: number | null
          weight: number | null
        }
        Insert: {
          active_minutes?: number | null
          body_fat_pct?: number | null
          calories_burned?: number | null
          calories_in?: number | null
          created_at?: string
          date?: string
          floors_climbed?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_resting?: number | null
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id: string
          water_ml?: number | null
          weight?: number | null
        }
        Update: {
          active_minutes?: number | null
          body_fat_pct?: number | null
          calories_burned?: number | null
          calories_in?: number | null
          created_at?: string
          date?: string
          floors_climbed?: number | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_resting?: number | null
          id?: string
          sleep_hours?: number | null
          steps?: number | null
          updated_at?: string
          user_id?: string
          water_ml?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          ai_analysis_json: Json | null
          calories: number | null
          carbs: number | null
          created_at: string
          fat: number | null
          food_name: string
          id: string
          logged_at: string
          meal_type: string
          photo_url: string | null
          protein: number | null
          user_id: string
        }
        Insert: {
          ai_analysis_json?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          food_name: string
          id?: string
          logged_at?: string
          meal_type: string
          photo_url?: string | null
          protein?: number | null
          user_id: string
        }
        Update: {
          ai_analysis_json?: Json | null
          calories?: number | null
          carbs?: number | null
          created_at?: string
          fat?: number | null
          food_name?: string
          id?: string
          logged_at?: string
          meal_type?: string
          photo_url?: string | null
          protein?: number | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string
          current_body_fat_pct: number | null
          first_name: string | null
          gender: string | null
          goal: string | null
          height_cm: number | null
          id: string
          onboarding_complete: boolean | null
          target_body_fat_pct: number | null
          target_calories: number | null
          target_lean_mass_kg: number | null
          target_muscle_mass_kg: number | null
          target_sleep_hours: number | null
          target_steps: number | null
          target_visceral_fat_index: number | null
          target_water_ml: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          weekly_goal_kg: number | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          current_body_fat_pct?: number | null
          first_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          onboarding_complete?: boolean | null
          target_body_fat_pct?: number | null
          target_calories?: number | null
          target_lean_mass_kg?: number | null
          target_muscle_mass_kg?: number | null
          target_sleep_hours?: number | null
          target_steps?: number | null
          target_visceral_fat_index?: number | null
          target_water_ml?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          weekly_goal_kg?: number | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string
          current_body_fat_pct?: number | null
          first_name?: string | null
          gender?: string | null
          goal?: string | null
          height_cm?: number | null
          id?: string
          onboarding_complete?: boolean | null
          target_body_fat_pct?: number | null
          target_calories?: number | null
          target_lean_mass_kg?: number | null
          target_muscle_mass_kg?: number | null
          target_sleep_hours?: number | null
          target_steps?: number | null
          target_visceral_fat_index?: number | null
          target_water_ml?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          weekly_goal_kg?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      user_context: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: []
      }
      workout_exercise_logs: {
        Row: {
          actual_reps: string | null
          actual_sets: number | null
          actual_weight: string | null
          created_at: string
          duration_seconds: number | null
          exercise_name: string
          exercise_order: number
          id: string
          notes: string | null
          planned_reps: string
          planned_sets: number
          planned_weight: string | null
          rest_seconds: number | null
          session_id: string
          skipped: boolean | null
          user_id: string
        }
        Insert: {
          actual_reps?: string | null
          actual_sets?: number | null
          actual_weight?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_name: string
          exercise_order: number
          id?: string
          notes?: string | null
          planned_reps: string
          planned_sets: number
          planned_weight?: string | null
          rest_seconds?: number | null
          session_id: string
          skipped?: boolean | null
          user_id: string
        }
        Update: {
          actual_reps?: string | null
          actual_sets?: number | null
          actual_weight?: string | null
          created_at?: string
          duration_seconds?: number | null
          exercise_name?: string
          exercise_order?: number
          id?: string
          notes?: string | null
          planned_reps?: string
          planned_sets?: number
          planned_weight?: string | null
          rest_seconds?: number | null
          session_id?: string
          skipped?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          started_at: string
          status: string
          target_muscles: string[] | null
          total_duration_seconds: number | null
          user_id: string
          workout_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          target_muscles?: string[] | null
          total_duration_seconds?: number | null
          user_id: string
          workout_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          started_at?: string
          status?: string
          target_muscles?: string[] | null
          total_duration_seconds?: number | null
          user_id?: string
          workout_name?: string
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
