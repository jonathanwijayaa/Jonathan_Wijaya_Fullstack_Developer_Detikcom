import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !publishableKey || !secretKey) {
  throw new Error("Supabase environment variables are missing");
}

export const supabaseAuth = createClient(
  supabaseUrl,
  publishableKey,
  {
    auth:{
        autoRefreshToken:false,
         persistSession: false,
      detectSessionInUrl: false,
    }
  }
);

export const supabaseAdmin = createClient(
  supabaseUrl,
  secretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);