import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Presencia online usando tabla Announcement con prefijo ol_
// Cada entrada: id = "ol_{peerId}", text = JSON({username, gender, isAdmin})

const ONLINE_EXPIRE_MS = 45000 // 45 segundos sin heartbeat = offline
const PREFIX = 'ol_'

function toId(peerId: string) { return PREFIX + peerId }

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const cutoff = new Date(Date.now() - ONLINE_EXPIRE_MS).toISOString()

    // Limpiar offline
    try {
      await supabase.from('announcement').delete().like('id', PREFIX + '%').lt('createdAt', cutoff)
    } catch {}

    // Contar online
    const { count, error } = await supabase
      .from('announcement')
      .select('*', { count: 'exact', head: true })
      .like('id', PREFIX + '%')
      .eq('active', true)
      .gte('createdAt', cutoff)

    if (error) return NextResponse.json({ count: 0, error: error.message }, { status: 500 })
    return NextResponse.json({ count: count || 0 })
  } catch (e) {
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, peerId, username, gender, isAdmin } = body

    if (action === 'join' && peerId && username) {
      const info = JSON.stringify({ username, gender: gender || '', isAdmin: !!isAdmin })
      const { error } = await supabase.from('announcement').upsert({
        id: toId(peerId),
        text: info,
        active: true,
        createdAt: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'heartbeat' && peerId) {
      const { error } = await supabase
        .from('announcement')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', toId(peerId))

      if (error) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      try {
        await supabase.from('announcement').delete().eq('id', toId(peerId))
      } catch {}
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
