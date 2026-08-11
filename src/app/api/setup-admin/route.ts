import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import bcrypt from 'bcryptjs'
import pg from 'pg'

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

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    const { error: testError } = await supabase.from('user').select('id').limit(1)
    if (testError) {
      return NextResponse.json({ success: false, error: `DB error: ${testError.message}` }, { status: 500 })
    }

    const { data: existing, error: findError } = await supabase.from('user').select('id').eq('username', 'superadmin').single()
    if (findError && findError.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: `Find error: ${findError.message}` }, { status: 500 })
    }

    if (existing) {
      await supabase.from('user').update({ isSuperAdmin: true, isAdmin: true, verified: true }).eq('username', 'superadmin')
    } else {
      const hashedPassword = await bcrypt.hash('superadmin123', 12)
      const { error: insertError } = await supabase.from('user').insert({
        username: 'superadmin', password: hashedPassword, gender: 'Hombre',
        isAdmin: true, isSuperAdmin: true, verified: true
      })
      if (insertError) return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    // Auto-crear tabla verify_queue
    let tableCreated = false
    const urlsToTry: string[] = []
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl && databaseUrl.startsWith('postgresql://')) urlsToTry.push(databaseUrl)
    const poolerUrl = getPoolerUrl()
    if (poolerUrl) urlsToTry.push(poolerUrl)

    for (const url of urlsToTry) {
      try {
        const client = new pg.Client({ connectionString: url })
        await client.connect()
        await client.query(`CREATE TABLE IF NOT EXISTS verify_queue ("peerId" TEXT PRIMARY KEY, username TEXT NOT NULL, gender TEXT DEFAULT 'unknown', "joinedAt" BIGINT DEFAULT 0, "adminPeerId" TEXT)`)
        await client.query(`CREATE INDEX IF NOT EXISTS idx_verify_queue_joinedAt ON verify_queue ("joinedAt")`)
        await client.end()
        tableCreated = true
        break
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: existing ? 'Super admin actualizado' : 'Super admin creado',
      verifyQueueTable: tableCreated ? 'creada exitosamente' : 'no se pudo crear',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}