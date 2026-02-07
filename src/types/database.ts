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
      daily_summaries: {
        Row: {
          created_at: string
          date: string
          id: string
          stats: Json | null
          summary_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          stats?: Json | null
          summary_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          stats?: Json | null
          summary_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dumps: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          id: string
          location: unknown
          raw_content: string
          transcript: string | null
          type: Database["public"]["Enums"]["dump_type"]
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          location?: unknown
          raw_content: string
          transcript?: string | null
          type?: Database["public"]["Enums"]["dump_type"]
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          id?: string
          location?: unknown
          raw_content?: string
          transcript?: string | null
          type?: Database["public"]["Enums"]["dump_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dumps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: Json | null
          context: Json | null
          created_at: string
          description: string | null
          dump_id: string | null
          end_at: string | null
          id: string
          is_all_day: boolean | null
          location: string | null
          recurrence_rule: string | null
          recurring_event_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: Json | null
          context?: Json | null
          created_at?: string
          description?: string | null
          dump_id?: string | null
          end_at?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          recurring_event_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attendees?: Json | null
          context?: Json | null
          created_at?: string
          description?: string | null
          dump_id?: string | null
          end_at?: string | null
          id?: string
          is_all_day?: boolean | null
          location?: string | null
          recurrence_rule?: string | null
          recurring_event_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_dump_id_fkey"
            columns: ["dump_id"]
            isOneToOne: false
            referencedRelation: "dumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          persona: Json | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          persona?: Json | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          persona?: Json | null
          preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          category: string | null
          content: Json | null
          created_at: string
          dump_id: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          content?: Json | null
          created_at?: string
          dump_id?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          content?: Json | null
          created_at?: string
          dump_id?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "records_dump_id_fkey"
            columns: ["dump_id"]
            isOneToOne: false
            referencedRelation: "dumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          context_type: Database["public"]["Enums"]["context_type"] | null
          created_at: string
          description: string | null
          due_date: string | null
          dump_id: string | null
          id: string
          importance: number | null
          is_ticket: boolean | null
          notes: Json | null
          parent_task_id: string | null
          related_people: Json | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          context_type?: Database["public"]["Enums"]["context_type"] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          dump_id?: string | null
          id?: string
          importance?: number | null
          is_ticket?: boolean | null
          notes?: Json | null
          parent_task_id?: string | null
          related_people?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          context_type?: Database["public"]["Enums"]["context_type"] | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          dump_id?: string | null
          id?: string
          importance?: number | null
          is_ticket?: boolean | null
          notes?: Json | null
          parent_task_id?: string | null
          related_people?: Json | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_dump_id_fkey"
            columns: ["dump_id"]
            isOneToOne: false
            referencedRelation: "dumps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      context_type:
        | "location_dependent"
        | "desk_work"
        | "communication"
        | "errand"
        | "quick"
        | "other"
      dump_type: "text" | "voice" | "image"
      event_status: "active" | "cancelled" | "completed"
      task_status: "pending" | "in_progress" | "done" | "deferred"
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
      context_type: [
        "location_dependent",
        "desk_work",
        "communication",
        "errand",
        "quick",
        "other",
      ],
      dump_type: ["text", "voice", "image"],
      event_status: ["active", "cancelled", "completed"],
      task_status: ["pending", "in_progress", "done", "deferred"],
    },
  },
} as const
