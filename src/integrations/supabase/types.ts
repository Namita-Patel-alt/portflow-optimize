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
      delay_records: {
        Row: {
          created_at: string
          delay_date: string
          delay_end: string
          delay_start: string
          duration_minutes: number | null
          id: string
          lift_log_id: string | null
          notes: string | null
          operator_id: string
          reason: Database["public"]["Enums"]["delay_reason"]
          shift_id: string | null
        }
        Insert: {
          created_at?: string
          delay_date?: string
          delay_end: string
          delay_start: string
          duration_minutes?: number | null
          id?: string
          lift_log_id?: string | null
          notes?: string | null
          operator_id: string
          reason: Database["public"]["Enums"]["delay_reason"]
          shift_id?: string | null
        }
        Update: {
          created_at?: string
          delay_date?: string
          delay_end?: string
          delay_start?: string
          duration_minutes?: number | null
          id?: string
          lift_log_id?: string | null
          notes?: string | null
          operator_id?: string
          reason?: Database["public"]["Enums"]["delay_reason"]
          shift_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delay_records_lift_log_id_fkey"
            columns: ["lift_log_id"]
            isOneToOne: false
            referencedRelation: "lift_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delay_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "work_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      lift_logs: {
        Row: {
          created_at: string
          hour_slot: string
          id: string
          lifts_count: number
          log_date: string
          operator_id: string
          shift_id: string | null
          target_met: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hour_slot: string
          id?: string
          lifts_count?: number
          log_date?: string
          operator_id: string
          shift_id?: string | null
          target_met?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hour_slot?: string
          id?: string
          lifts_count?: number
          log_date?: string
          operator_id?: string
          shift_id?: string | null
          target_met?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lift_logs_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "work_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_ratings: {
        Row: {
          comments: string | null
          created_at: string
          id: string
          operator_id: string
          rated_by: string | null
          rating: number
          rating_date: string
        }
        Insert: {
          comments?: string | null
          created_at?: string
          id?: string
          operator_id: string
          rated_by?: string | null
          rating: number
          rating_date?: string
        }
        Update: {
          comments?: string | null
          created_at?: string
          id?: string
          operator_id?: string
          rated_by?: string | null
          rating?: number
          rating_date?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          employee_id: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_number: string
          vehicle_type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number: string
          vehicle_type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_number?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      work_shifts: {
        Row: {
          created_at: string
          end_time: string
          id: string
          operator_id: string
          shift_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          operator_id: string
          shift_date?: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          operator_id?: string
          shift_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "crane_operator" | "supervisor" | "higher_authority"
      delay_reason:
        | "crane_malfunction"
        | "vehicle_unavailability"
        | "weather_conditions"
        | "operator_break"
        | "vessel_repositioning"
        | "safety_incident"
      vehicle_status: "available" | "in_use" | "maintenance" | "unavailable"
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
      app_role: ["crane_operator", "supervisor", "higher_authority"],
      delay_reason: [
        "crane_malfunction",
        "vehicle_unavailability",
        "weather_conditions",
        "operator_break",
        "vessel_repositioning",
        "safety_incident",
      ],
      vehicle_status: ["available", "in_use", "maintenance", "unavailable"],
    },
  },
} as const
