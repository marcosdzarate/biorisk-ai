import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Base client (no auth)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false }
})

// Returns a client with Auth0 JWT token
export function getSupabaseWithAuth(token) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { persistSession: false }
  })
}