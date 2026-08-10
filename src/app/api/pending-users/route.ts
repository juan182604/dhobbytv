import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'
import { setVerified, deleteUser } from '@/lib/auth'

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user')
      .select('id, username, gender, "createdAt"')
      .eq('verified', false)
      .eq('isAdmin', false)
      .eq('isSuperAdmin', false)
      .eq('banned', false)
      .order('createdAt', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ users: data || [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, username } = body

    if (action === 'verify' && userId) {
      await setVerified(userId)
      return NextResponse.json({ success: true })
    }
    if (action === 'reject' && userId) {
      await deleteUser(userId)
      return NextResponse.json({ success: true })
    }
    if (action === 'verify-username' && username) {
      const supabase = getSupabaseClient()
      const { data: user } = await supabase.from('user').select('id').eq('username', username).single()
      if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
      await setVerified(user.id)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
