import { NextResponse } from 'next/server'
import pg from 'pg'

// Este endpoint crea la tabla verify_queue en Supabase PostgreSQL
// Se debe ejecutar UNA VEZ despues de desplegar
// GET /api/setup-verify-queue

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      return NextResponse.json({ 
        error: 'DATABASE_URL no esta configurada. Agregala en Vercel > Settings > Environment Variables',
        hint: 'La URL debe ser la de PostgreSQL de Supabase: postgresql://postgres...'
      }, { status: 500 })
    }

    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
      return NextResponse.json({ 
        error: 'DATABASE_URL debe ser una URL de PostgreSQL (empieza con postgresql://)',
        current: databaseUrl.substring(0, 20) + '...'
      }, { status: 500 })
    }

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

    // Crear indice para limpiar expirados rapidamente
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt")
    `)

    await client.end()

    return NextResponse.json({ 
      success: true, 
      message: 'Tabla verify_queue creada exitosamente' 
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
