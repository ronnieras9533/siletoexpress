import { createClient } from "@supabase/supabase-js";

// Detect if running in browser or server
const isBrowser = typeof window !== "undefined";

// For browser: use Vite env variables (VITE_)
const supabaseUrl = isBrowser
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.SUPABASE_URL;

const supabaseKey = isBrowser
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Safety check
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase URL and Key must be set as environment variables."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
