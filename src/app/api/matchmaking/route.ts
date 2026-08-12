import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Matchmaking usando tabla Announcement con prefijo mm_
// Cada entrada: id = "mm_{peerId}", text = JSON({username, gender, country, countryCode, hobbies, countryFilter})

const MATCH_EXPIRE_MS = 90000 // 90 segundos
const PREFIX = 'mm_'

function toId(peerId: string) { return PREFIX + peerId }
function fromId(id: string) { return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : null }

function parseData(text: string): any {
  try { return JSON.parse(text) }
  catch { return null }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const cutoff = new Date(Date.now() - MATCH_EXPIRE_MS).toISOString()

    // Limpiar expirados
    try {
      await supabase.from('announcement').delete().like('id', PREFIX + '%').lt('createdAt', cutoff)
    } catch {}

    // Obtener todos los que estan buscando
    const { data, error } = await supabase
      .from('announcement')
      .select('id, text, createdAt')
      .like('id', PREFIX + '%')
      .eq('active', true)
      .order('createdAt', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const searching = (data || []).map((d: any) => {
      const peerId = fromId(d.id)
      const info = parseData(d.text) || {}
      return {
        peerId,
        username: info.username || 'unknown',
        gender: info.gender || '',
        country: info.country || '',
        countryCode: info.countryCode || '',
        hobbies: info.hobbies || [],
        countryFilter: info.countryFilter || 'all',
        timestamp: new Date(d.createdAt).getTime(),
      }
    }).filter((d: any) => d.peerId)

    return NextResponse.json({ searching })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, peerId, username, gender, country, countryCode, hobbies, countryFilter } = body

    if (action === 'join' && peerId && username) {
      // Borrar entrada previa del mismo peerId
      try {
        await supabase.from('announcement').delete().eq('id', toId(peerId))
      } catch {}

      const matchData = JSON.stringify({ username, gender: gender || '', country: country || '', countryCode: countryCode || '', hobbies: hobbies || [], countryFilter: countryFilter || 'all' })
      const { error } = await supabase.from('announcement').upsert({
        id: toId(peerId),
        text: matchData,
        active: true,
        createdAt: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      try {
        await supabase.from('announcement').delete().eq('id', toId(peerId))
      } catch {}
      return NextResponse.json({ success: true })
    }

    if (action === 'heartbeat' && peerId) {
      const { error } = await supabase
        .from('announcement')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', toId(peerId))
      if (error) return NextResponse.json({ error: 'No esta buscando' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
