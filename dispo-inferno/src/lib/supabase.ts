import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
    const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.'
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

// For backward compatibility and ease of use, we can still export a proxy or just update call sites.
// Updating call sites is cleaner.
