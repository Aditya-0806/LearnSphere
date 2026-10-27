import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksLikePlaceholder = !url || !key || url.includes('your-project-ref') || key.startsWith('your-');

/** False until the two public Supabase variables are set in .env / Vercel. */
export const isConfigured = !looksLikePlaceholder;

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
