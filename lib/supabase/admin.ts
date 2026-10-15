import "server-only";
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  // supabase-js sends a stored user session instead of the key when one exists;
  // this client must never hold one.
  { auth: { autoRefreshToken: false, persistSession: false } },
);
