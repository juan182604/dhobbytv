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
      return NextResponse.json({ success: true, message: 'Super admin actualizado' })
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
      return NextResponse.json({ success: true, message: 'Super admin creado' })
    }
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
