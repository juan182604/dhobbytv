import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

    return NextResponse.json({
      success: true,
      message: existing ? 'Super admin actualizado' : 'Super admin creado',
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
