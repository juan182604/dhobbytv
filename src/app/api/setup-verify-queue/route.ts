import { NextResponse } from 'next/server'
import pg from 'pg'

// Crea la tabla verify_queue en Supabase PostgreSQL
// Usa el connection pooler de Supabase (el host directo no resuelve desde Vercel)

export async function GET() {
  const results: string[] = []

  // Metodo 1: Conexion directa via DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL
  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
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
      return NextResponse.json({ success: true, method: 'conexion directa' })
    } catch (e: any) {
      results.push('Directa fallo: ' + e.code)
    }
  }

  // Metodo 2: Via Supabase Connection Pooler (el host directo a veces no resuelve desde Vercel)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const refMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
  
  if (refMatch && databaseUrl) {
    const ref = refMatch[1]
    // Extraer password del DATABASE_URL original
    const passMatch = databaseUrl.match(/:\/\/[^:]+:([^@]+)@/)
    const password = passMatch ? passMatch[1] : ''
    
    if (password) {
      // Pooler URL: postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres
      const poolerUrl = `postgresql://postgres.${ref}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
      
      try {
        const client = new pg.Client({ connectionString: poolerUrl })
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
        return NextResponse.json({ success: true, method: 'connection pooler' })
      } catch (e: any) {
        results.push('Pooler fallo: ' + e.message)
      }
    }
  }

  return NextResponse.json({ success: false, attempts: results })
}