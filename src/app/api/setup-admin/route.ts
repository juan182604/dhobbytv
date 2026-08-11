import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const supabase = getSupabaseClient()

    // Test DB connection first
    const { error: testError } = await supabase.from('user').select('id').limit(1)
    if (testError) {
      return NextResponse.json({
        success: false,
        error: `DB error: ${testError.message} (code: ${testError.code})`
      }, { status: 500 })
    }

    const { data: existing, error: findError } = await supabase.from('user').select('id').eq('username', 'superadmin').single()
    if (findError && findError.code !== 'PGRST116') {
      return NextResponse.json({ success: false, error: `Find error: ${findError.message}` }, { status: 500 })
    }

    if (existing) {
      const { error: updateError } = await supabase.from('user').update({ isSuperAdmin: true, isAdmin: true, verified: true }).eq('username', 'superadmin')
      if (updateError) return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    } else {
      const hashedPassword = await bcrypt.hash('superadmin123', 12)
      const { error: insertError } = await supabase.from('user').insert({
        username: 'superadmin',
        password: hashedPassword,
        gender: 'Hombre',
        isAdmin: true,
        isSuperAdmin: true,
        verified: true
      })
      if (insertError) return NextResponse.json({ success: false, error: `Insert error: ${insertError.message} (code: ${insertError.code})` }, { status: 500 })
    }

    // Auto-crear tabla verify_queue via Supabase pg/query endpoint
    let tableCreated = false
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
          tableCreated = response.ok
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: existing ? 'Super admin actualizado' : 'Super admin creado',
      verifyQueueTable: tableCreated ? 'creada exitosamente' : 'no se pudo crear automaticamente',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}