import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const { data: existing } = await supabase.from('user').select('id').eq('username', 'superadmin').single()
    if (existing) {
      await supabase.from('user').update({ isSuperAdmin: true, isAdmin: true, verified: true }).eq('username', 'superadmin')
    } else {
      const hashedPassword = await bcrypt.hash('superadmin123', 12)
      await supabase.from('user').insert({ username: 'superadmin', password: hashedPassword, gender: 'Hombre', isAdmin: true, isSuperAdmin: true, verified: true })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('setup-admin error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
