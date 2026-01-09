import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env.js";

const supabaseUrl = ENV.SUPABASE_URL;
const supabaseRoleKey = ENV.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseRoleKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

export default supabase;
