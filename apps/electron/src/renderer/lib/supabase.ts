import { createSupabaseClient } from '@home-dashboard/database/browser';

// Singleton Supabase client for renderer process
// This prevents multiple GoTrueClient instances warning
export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
