import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import pg from 'pg'

// Cola de verificacion en SUPABASE PostgreSQL (persiste entre TODAS las instancias de Vercel)
// Usa connection pooler cuando el host directo no resuelve

const FIVE_MINUTES_MS = 300000
let tableEnsured = false

function getPoolerUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  const passMatch = databaseUrl.match(/:\/\/[^:]+:([^@]+)@/)
  if (refMatch && passMatch) {
    return `postgresql://postgres.${refMatch[1]}:${passMatch[1]}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
  }
  return null
}

async function ensureTable(): Promise<boolean> {
  if (tableEnsured) return true

  // Intentar con DATABASE_URL directo
  const databaseUrl = process.env.DATABASE_URL
  const urlsToTry: string[] = []
  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    urlsToTry.push(databaseUrl)
  }
  // Intentar con pooler
  const poolerUrl = getPoolerUrl()
  if (poolerUrl) urlsToTry.push(poolerUrl)

  for (const url of urlsToTry) {
    try {
      const client = new pg.Client({ connectionString: url })
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
      console.log('[verify-queue] Tabla creada via: ' + (url === databaseUrl ? 'directa' : 'pooler'))
      return true
    } catch (e: any) {
      console.log('[verify-queue] Fallo conexion:', url.substring(0, 50), e.code || e.message)
    }
  }
  return false
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const now = Date.now()

    // Limpiar expirados
    try { await supabase.from('verify_queue').delete().lt('joinedAt', now - FIVE_MINUTES_MS) } catch {}

    // Obtener cola
    const { data, error } = await supabase
      .from('verify_queue')
      .select('peerId, username, gender, joinedAt')
      .is('adminPeerId', null)
      .order('joinedAt', { ascending: true })

    if (error) {
      if (error.code === '42P01') {
        const created = await ensureTable()
        if (!created) return NextResponse.json({ queue: [], needSetup: true })
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
        peerId, username, gender: gender || 'unknown', joinedAt: now, adminPeerId: null,
      }, { onConflict: 'peerId' })

      if (error) {
        if (error.code === '42P01') {
          const created = await ensureTable()
          if (!created) return NextResponse.json({ error: 'Tabla no existe. Visita /api/setup-verify-queue' }, { status: 500 })
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
      const { error } = await supabase.from('verify_queue').update({ joinedAt: Date.now() }).eq('peerId', peerId)
      if (error) return NextResponse.json({ error: 'No esta en la cola' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
