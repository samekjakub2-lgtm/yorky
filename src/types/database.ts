// ⚠️ Tento súbor sa GENERUJE – needituj ručne.
//   npx supabase gen types typescript --local > src/types/database.ts
// Aktuálna verzia bola zostavená podľa supabase/migrations/ (init + likes_matches);
// po prvom `supabase start` ju pregeneruj.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      blocks: {
        Row: { blocked_id: string; blocker_id: string; created_at: string };
        Insert: { blocked_id: string; blocker_id: string; created_at?: string };
        Update: { blocked_id?: string; blocker_id?: string; created_at?: string };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          last_message_at: string | null;
          user_a: string;
          user_b: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          user_a: string;
          user_b: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_message_at?: string | null;
          user_a?: string;
          user_b?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: {
          expires_at: string | null;
          is_premium: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          expires_at?: string | null;
          is_premium?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          expires_at?: string | null;
          is_premium?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: { created_at: string; likee_id: string; liker_id: string };
        Insert: { created_at?: string; likee_id: string; liker_id: string };
        Update: { created_at?: string; likee_id?: string; liker_id?: string };
        Relationships: [];
      };
      matches: {
        Row: { created_at: string; id: string; user_a: string; user_b: string };
        Insert: { created_at?: string; id?: string; user_a: string; user_b: string };
        Update: { created_at?: string; id?: string; user_a?: string; user_b?: string };
        Relationships: [];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          read_at: string | null;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          read_at?: string | null;
          sender_id?: string;
        };
        Relationships: [];
      };
      profile_photos: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          storage_path: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position?: number;
          storage_path: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          bio: string | null;
          birth_date: string;
          created_at: string;
          display_name: string;
          height_cm: number | null;
          hide_distance: boolean;
          id: string;
          is_incognito: boolean;
          last_active_at: string;
          locale: string;
          updated_at: string;
        };
        Insert: {
          bio?: string | null;
          birth_date: string;
          created_at?: string;
          display_name: string;
          height_cm?: number | null;
          hide_distance?: boolean;
          id: string;
          is_incognito?: boolean;
          last_active_at?: string;
          locale?: string;
          updated_at?: string;
        };
        Update: {
          bio?: string | null;
          birth_date?: string;
          created_at?: string;
          display_name?: string;
          height_cm?: number | null;
          hide_distance?: boolean;
          id?: string;
          is_incognito?: boolean;
          last_active_at?: string;
          locale?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          details: string | null;
          id: string;
          reason: Database['public']['Enums']['report_reason'];
          reported_id: string;
          reporter_id: string;
        };
        Insert: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason: Database['public']['Enums']['report_reason'];
          reported_id: string;
          reporter_id: string;
        };
        Update: {
          created_at?: string;
          details?: string | null;
          id?: string;
          reason?: Database['public']['Enums']['report_reason'];
          reported_id?: string;
          reporter_id?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      discover_nearby: {
        Args: { p_limit?: number; p_offset?: number };
        Returns: {
          age: number;
          display_name: string;
          distance_bucket_km: number | null;
          id: string;
          last_active_at: string;
          primary_photo_path: string | null;
        }[];
      };
      get_profile: {
        Args: { p_user_id: string };
        Returns: {
          age: number;
          bio: string | null;
          display_name: string;
          distance_bucket_km: number | null;
          height_cm: number | null;
          id: string;
          photo_paths: string[];
        }[];
      };
      like_profile: { Args: { p_user_id: string }; Returns: string | null };
      list_incoming_likes: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age: number;
          display_name: string;
          liked_at: string;
          primary_photo_path: string | null;
          user_id: string;
        }[];
      };
      list_matches: {
        Args: Record<PropertyKey, never>;
        Returns: {
          age: number;
          display_name: string;
          match_id: string;
          matched_at: string;
          primary_photo_path: string | null;
          user_id: string;
        }[];
      };
      start_conversation: { Args: { p_other: string }; Returns: string };
      update_my_location: { Args: { lat: number; lng: number }; Returns: undefined };
    };
    Enums: {
      report_reason:
        'fake_profile' | 'harassment' | 'spam' | 'underage' | 'inappropriate_content' | 'other';
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T];
