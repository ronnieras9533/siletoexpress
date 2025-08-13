// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Detect environment: browser or server (Node/Deno)
const isBrowser = typeof window !== "undefined";

const supabaseUrl = isBrowser
  ? import.meta.env.VITE_SUPABASE_URL
  : process.env.SUPABASE_URL;

const supabaseKey = isBrowser
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be set in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
