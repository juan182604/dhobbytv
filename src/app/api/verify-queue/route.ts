import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Cola de verificacion en SUPABASE PostgreSQL (persiste entre TODAS las instancias de Vercel)
// Ya NO usa Map en memoria porque Vercel serverless tiene instancias separadas

const FIVE_MINUTES_MS = 300000

async function ensureTable(supabase: any): Promise<boolean> {
  // Intentar crear la tabla via Supabase REST API usando fetch directo al endpoint pg/query
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) return false
  
  try {
    // Extraer el ref del proyecto de la URL (https://xxx.supabase.co -> xxx)
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
    if (!urlMatch) return false
    const ref = urlMatch[1]
    
    // Intentar via endpoint pg/query de Supabase
    const pgUrl = `https://${ref}.supabase.co/pg/query`
    const response = await fetch(pgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({
        query: `
          CREATE TABLE IF NOT EXISTS verify_queue (
            "peerId" TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            gender TEXT DEFAULT 'unknown',
            "joinedAt" BIGINT DEFAULT 0,
            "adminPeerId" TEXT
          );
          CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt");
        `
      }),
    })
    
    if (response.ok) return true
    
    // Si pg/query no funciona, intentar con el endpoint REST rpc
    // Crear una funcion temporal que crea la tabla
    const createFuncSql = `
      CREATE OR REPLACE FUNCTION create_verify_queue_table()
      RETURNS void AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS verify_queue (
          "peerId" TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          gender TEXT DEFAULT 'unknown',
          "joinedAt" BIGINT DEFAULT 0,
          "adminPeerId" TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt");
      END;
      $$ LANGUAGE plpgsql;
    `
    
    // Intentar ejecutar SQL via el endpoint SQL de Supabase
    const sqlUrl = `https://${ref}.supabase.co/rest/v1/rpc/`
    const funcResponse = await fetch(pgUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: createFuncSql }),
    })
    
    return funcResponse.ok
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const now = Date.now()

    // Limpiar expirados (envolver en try-catch, no usar .catch() en query builder)
    try {
      await supabase.from('verify_queue').delete().lt('joinedAt', now - FIVE_MINUTES_MS)
    } catch {}

    // Obtener cola (solo los que no tienen admin asignado)
    const { data, error } = await supabase
      .from('verify_queue')
      .select('peerId, username, gender, joinedAt')
      .is('adminPeerId', null)
      .order('joinedAt', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        // Tabla no existe, intentar crearla
        const created = await ensureTable(supabase)
        if (!created) {
          return NextResponse.json({ queue: [], needSetup: true, setupUrl: '/api/setup-verify-queue' })
        }
        // Reintentar
        const { data: retryData } = await supabase
          .from('verify_queue')
          .select('peerId, username, gender, joinedAt')
          .is('adminPeerId', null)
          .order('joinedAt', { ascending: true })
        return NextResponse.json({ queue: (retryData || []) })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const queue = (data || []).map((d: any) => ({
      peerId: d.peerId,
      username: d.username,
      gender: d.gender,
      timestamp: d.joinedAt,
    }))

    return NextResponse.json({ queue })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, peerId, username, gender } = body

    if (action === 'join' && peerId && username) {
      const now = Date.now()
      let { error } = await supabase.from('verify_queue').upsert({
        peerId,
        username,
        gender: gender || 'unknown',
        joinedAt: now,
        adminPeerId: null,
      }, { onConflict: 'peerId' })

      if (error) {
        if (error.code === '42P01') {
          const created = await ensureTable(supabase)
          if (!created) return NextResponse.json({ error: 'Tabla no existe. Visita /api/setup-verify-queue para crearla.' }, { status: 500 })
          const result = await supabase.from('verify_queue').upsert({
            peerId, username, gender: gender || 'unknown', joinedAt: now, adminPeerId: null,
          }, { onConflict: 'peerId' })
          if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      try { await supabase.from('verify_queue').delete().eq('peerId', peerId) } catch {}
      return NextResponse.json({ success: true })
    }

    if (action === 'heartbeat' && peerId) {
      const now = Date.now()
      const { error } = await supabase
        .from('verify_queue')
        .update({ joinedAt: now })
        .eq('peerId', peerId)
      if (error) return NextResponse.json({ error: 'No esta en la cola' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
