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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          meta: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          approve_bots: boolean
          ban_users: boolean
          created_at: string
          delete_bots: boolean
          feature_bots: boolean
          manage_categories: boolean
          manage_moderators: boolean
          manage_reports: boolean
          manage_reviews: boolean
          updated_at: string
          updated_by: string | null
          user_id: string
          verify_bots: boolean
          view_audit_logs: boolean
          view_users: boolean
        }
        Insert: {
          approve_bots?: boolean
          ban_users?: boolean
          created_at?: string
          delete_bots?: boolean
          feature_bots?: boolean
          manage_categories?: boolean
          manage_moderators?: boolean
          manage_reports?: boolean
          manage_reviews?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id: string
          verify_bots?: boolean
          view_audit_logs?: boolean
          view_users?: boolean
        }
        Update: {
          approve_bots?: boolean
          ban_users?: boolean
          created_at?: string
          delete_bots?: boolean
          feature_bots?: boolean
          manage_categories?: boolean
          manage_moderators?: boolean
          manage_reports?: boolean
          manage_reviews?: boolean
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          verify_bots?: boolean
          view_audit_logs?: boolean
          view_users?: boolean
        }
        Relationships: []
      }
      admin_requests: {
        Row: {
          created_at: string
          id: string
          requested_by: string
          requested_email: string
          requested_user_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["admin_request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by: string
          requested_email: string
          requested_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["admin_request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string
          requested_email?: string
          requested_user_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["admin_request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          bot_id: string | null
          country: string | null
          created_at: string
          device: string | null
          event_type: string
          id: number
          path: string | null
          referrer: string | null
          search_term: string | null
          visitor_hash: string | null
        }
        Insert: {
          bot_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type: string
          id?: number
          path?: string | null
          referrer?: string | null
          search_term?: string | null
          visitor_hash?: string | null
        }
        Update: {
          bot_id?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          event_type?: string
          id?: number
          path?: string | null
          referrer?: string | null
          search_term?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_categories: {
        Row: {
          bot_id: string
          category_id: string
        }
        Insert: {
          bot_id: string
          category_id: string
        }
        Update: {
          bot_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_categories_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      bots: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          featured: boolean
          id: string
          invite_url: string | null
          is_demo: boolean
          long_description: string | null
          name: string
          owner_id: string | null
          owner_name: string
          prefix: string | null
          premium: boolean
          rating: number
          rating_count: number
          rejection_reason: string | null
          server_count: number
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["bot_status"]
          support_url: string | null
          tags: string[]
          updated_at: string
          verified: boolean
          view_count: number
          vote_count: number
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          invite_url?: string | null
          is_demo?: boolean
          long_description?: string | null
          name: string
          owner_id?: string | null
          owner_name?: string
          prefix?: string | null
          premium?: boolean
          rating?: number
          rating_count?: number
          rejection_reason?: string | null
          server_count?: number
          short_description: string
          slug: string
          status?: Database["public"]["Enums"]["bot_status"]
          support_url?: string | null
          tags?: string[]
          updated_at?: string
          verified?: boolean
          view_count?: number
          vote_count?: number
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          featured?: boolean
          id?: string
          invite_url?: string | null
          is_demo?: boolean
          long_description?: string | null
          name?: string
          owner_id?: string | null
          owner_name?: string
          prefix?: string | null
          premium?: boolean
          rating?: number
          rating_count?: number
          rejection_reason?: string | null
          server_count?: number
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["bot_status"]
          support_url?: string | null
          tags?: string[]
          updated_at?: string
          verified?: boolean
          view_count?: number
          vote_count?: number
          website_url?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          discord_id: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          discord_id?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          bot_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          bot_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          bot_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          active: boolean
          banned_at: string
          banned_by: string | null
          created_at: string
          expires_at: string | null
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_moderation_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          target_user_id?: string
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
      votes: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          period_key: string
          user_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          period_key: string
          user_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          period_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_admin_permission: {
        Args: { permission_name: string; target_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_botgalaxy_owner: { Args: { target_user_id: string }; Returns: boolean }
      is_user_banned: { Args: { target_user_id: string }; Returns: boolean }
      review_admin_request: {
        Args: { p_action: string; p_request_id: string; p_reviewer: string }
        Returns: Json
      }
    }
    Enums: {
      admin_request_status: "pending" | "approved" | "denied" | "cancelled"
      app_role: "admin" | "moderator" | "user"
      bot_status: "pending" | "approved" | "rejected"
      report_status: "open" | "resolved" | "dismissed"
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
      admin_request_status: ["pending", "approved", "denied", "cancelled"],
      app_role: ["admin", "moderator", "user"],
      bot_status: ["pending", "approved", "rejected"],
      report_status: ["open", "resolved", "dismissed"],
    },
  },
} as const
