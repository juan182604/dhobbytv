import { NextResponse } from 'next/server'
import pg from 'pg'

// Crea la tabla verify_queue probando multiples metodos de conexion

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const results: string[] = []

  // Extraer credenciales del DATABASE_URL
  const passMatch = databaseUrl.match(/:\/\/[^:]+:([^@]+)@/)
  const password = passMatch ? passMatch[1] : ''
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  const ref = refMatch ? refMatch[1] : ''

  // Lista de URLs a probar en orden
  const urls: { name: string; url: string }[] = []

  // 1. DATABASE_URL directo
  if (databaseUrl.startsWith('postgresql://')) {
    urls.push({ name: 'directa', url: databaseUrl })
  }

  if (ref && password) {
    // 2. Pooler session mode (port 5432)
    urls.push({ name: 'pooler-session', url: `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres` })
    // 3. Pooler transaction mode (port 6543)
    urls.push({ name: 'pooler-transaction', url: `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres` })
    // 4. Sin prefijo postgres en username
    urls.push({ name: 'pooler-noprefix', url: `postgresql://postgres:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres` })
  }

  for (const { name, url } of urls) {
    try {
      const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 })
      await client.connect()
      await client.query(`CREATE TABLE IF NOT EXISTS verify_queue ("peerId" TEXT PRIMARY KEY, username TEXT NOT NULL, gender TEXT DEFAULT 'unknown', "joinedAt" BIGINT DEFAULT 0, "adminPeerId" TEXT)`)
      await client.query(`CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt")`)
      await client.end()
      return NextResponse.json({ success: true, method: name })
    } catch (e: any) {
      results.push(`${name}: ${e.code || e.message.substring(0, 80)}`)
    }
  }

  return NextResponse.json({ success: false, attempts: results })
}