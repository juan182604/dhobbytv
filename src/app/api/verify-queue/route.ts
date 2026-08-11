import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import pg from 'pg'

// Cola de verificacion en SUPABASE PostgreSQL (persiste entre TODAS las instancias de Vercel)
// Ya NO usa Map en memoria porque Vercel serverless tiene instancias separadas

const FIVE_MINUTES_MS = 300000
let tableEnsured = false

// Asegurar que la tabla existe (se ejecuta una sola vez por instancia)
async function ensureTable(): Promise<boolean> {
  if (tableEnsured) return true
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://'))) {
    return false
  }
  try {
    const client = new pg.Client({ connectionString: databaseUrl })
    await client.connect()
    await client.query(`
      CREATE TABLE IF NOT EXISTS verify_queue (
        "peerId" TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        gender TEXT DEFAULT 'unknown',
        "joinedAt" BIGINT DEFAULT 0,
        "adminPeerId" TEXT
      )
    `)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt")`)
    await client.end()
    tableEnsured = true
    return true
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const now = Date.now()

    // Limpiar expirados primero
    await supabase.from('verify_queue').delete().lt('joinedAt', now - FIVE_MINUTES_MS).catch(() => {})

    // Obtener cola (solo los que no tienen admin asignado)
    const { data, error } = await supabase
      .from('verify_queue')
      .select('peerId, username, gender, joinedAt')
      .is('adminPeerId', null)
      .order('joinedAt', { ascending: true })

    if (error) {
      // Si la tabla no existe, intentar crearla
      if (error.code === '42P01') {
        const created = await ensureTable()
        if (!created) return NextResponse.json({ queue: [], needSetup: true })
        // Reintentar despues de crear
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
      const { error } = await supabase.from('verify_queue').upsert({
        peerId,
        username,
        gender: gender || 'unknown',
        joinedAt: now,
        adminPeerId: null,
      }, { onConflict: 'peerId' })

      if (error) {
        if (error.code === '42P01') {
          const created = await ensureTable()
          if (!created) return NextResponse.json({ error: 'Tabla no existe. Visita /api/setup-verify-queue' }, { status: 500 })
          const { error: retryError } = await supabase.from('verify_queue').upsert({
            peerId, username, gender: gender || 'unknown', joinedAt: now, adminPeerId: null,
          }, { onConflict: 'peerId' })
          if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
        } else {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      await supabase.from('verify_queue').delete().eq('peerId', peerId)
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
