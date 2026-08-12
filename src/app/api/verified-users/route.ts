import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user')
      .select('id, username, gender, "createdAt"')
      .eq('verified', true)
      .eq('isAdmin', false)
      .eq('isSuperAdmin', false)
      .eq('banned', false)
      .order('createdAt', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
