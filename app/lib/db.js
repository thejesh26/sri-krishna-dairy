import { createClient } from '@supabase/supabase-js'

// Singleton service-role client — bypasses RLS.
// Use ONLY for privileged server operations (admin actions, cron jobs, webhook handlers).
// For user-scoped queries that should respect RLS, use createServerClient() with the user's JWT.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
