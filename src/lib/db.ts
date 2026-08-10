import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        `Faltan variables de entorno de Supabase. ` +
        `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl ? 'OK' : 'FALTA'}, ` +
        `SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey ? 'OK' : 'FALTA'}`
      )
    }
    
    _supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })
  }
  return _supabase
}

// Legacy re-export for compatibility
export const db = { get client() { return getSupabaseClient() } }
