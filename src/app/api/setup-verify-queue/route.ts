import { NextResponse } from 'next/server'
import pg from 'pg'

// Crea la tabla verify_queue en Supabase PostgreSQL
// Intenta: 1) pg directo con DATABASE_URL, 2) fetch al endpoint pg/query de Supabase

export async function GET() {
  const results: string[] = []

  // Metodo 1: Conexion directa via pg con DATABASE_URL
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
      results.push('Creada via conexion directa (pg)')
    } catch (e: any) {
      results.push('Fallo conexion directa: ' + e.message)
    }
  } else {
    results.push('DATABASE_URL no es PostgreSQL (es ' + (databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'vacia') + ')')
  }

  if (results.some(r => r.includes('Creada'))) {
    return NextResponse.json({ success: true, method: results.join('; ') })
  }

  // Metodo 2: Via Supabase pg/query REST endpoint
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && serviceKey) {
    try {
      const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
      if (urlMatch) {
        const ref = urlMatch[1]
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

        if (response.ok) {
          const text = await response.text()
          results.push('Creada via pg/query endpoint: ' + text)
          return NextResponse.json({ success: true, method: results.join('; ') })
        } else {
          const text = await response.text()
          results.push('pg/query fallo (' + response.status + '): ' + text)
        }
      }
    } catch (e: any) {
      results.push('pg/query error: ' + e.message)
    }
  } else {
    results.push('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  return NextResponse.json({ 
    success: false, 
    attempts: results,
    hint: 'Si ninguno funciono, copia y pega este SQL en Supabase SQL Editor (https://supabase.com/dashboard):',
    sql: `CREATE TABLE IF NOT EXISTS verify_queue ("peerId" TEXT PRIMARY KEY, username TEXT NOT NULL, gender TEXT DEFAULT 'unknown', "joinedAt" BIGINT DEFAULT 0, "adminPeerId" TEXT);
CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt");`
  })
}