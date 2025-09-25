import { createClient } from "@supabase/supabase-js";

// Supabase configuration - you'll need to add these to your .env file
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
