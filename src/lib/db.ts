import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
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

// Lazy accessor — only initializes when first called at runtime
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabase()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})

// Re-export as 'db' for compatibility
export const db = supabase
