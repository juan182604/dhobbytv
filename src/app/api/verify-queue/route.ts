import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Cola de verificacion usando la tabla EXISTENTE Announcement
// Cada entrada de cola es un Announcement con:
//   id = "vq_{peerId}" (prefijo vq_ para distinguir de anuncios reales)
//   text = JSON.stringify({username, gender})
//   active = true (en cola)
//   createdAt = timestamp de cuando se unio

const FIVE_MINUTES_MS = 300000
const QUEUE_PREFIX = 'vq_'

// Helper: extract peerId from announcement id
function toQueueId(peerId: string) { return QUEUE_PREFIX + peerId }
function fromQueueId(id: string) { return id.startsWith(QUEUE_PREFIX) ? id.slice(QUEUE_PREFIX.length) : null }

function parseQueueData(text: string): { username: string; gender: string } {
  try { return JSON.parse(text) }
  catch { return { username: 'unknown', gender: 'unknown' } }
}

export async function GET() {
  try {
    const supabase = getSupabaseClient()
    const now = Date.now()
    const cutoff = new Date(now - FIVE_MINUTES_MS).toISOString()

    // Limpiar expirados (anuncios con prefijo vq_ mas antiguos de 5 min)
    try {
      await supabase
        .from('announcement')
        .delete()
        .like('id', QUEUE_PREFIX + '%')
        .lt('createdAt', cutoff)
    } catch {}

    // Obtener cola: anuncios activos con prefijo vq_
    const { data, error } = await supabase
      .from('announcement')
      .select('id, text, createdAt')
      .like('id', QUEUE_PREFIX + '%')
      .eq('active', true)
      .order('createdAt', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const queue = (data || []).map((d: any) => {
      const peerId = fromQueueId(d.id)
      const info = parseQueueData(d.text)
      return {
        peerId,
        username: info.username,
        gender: info.gender,
        timestamp: new Date(d.createdAt).getTime(),
      }
    }).filter((d: any) => d.peerId)

    return NextResponse.json({ queue })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, peerId, username, gender } = body

    if (action === 'join' && peerId && username) {
      // Borrar entradas previas del mismo usuario (evita duplicados al salir/volver)
      try {
        const { data: existing } = await supabase
          .from('announcement')
          .select('id, text')
          .like('id', QUEUE_PREFIX + '%')
          .eq('active', true)
        if (existing && existing.length > 0) {
          const toDelete = existing.filter((d: any) => parseQueueData(d.text).username === username)
          if (toDelete.length > 0) {
            await supabase.from('announcement').delete().in('id', toDelete.map((d: any) => d.id))
          }
        }
      } catch {}

      const queueData = JSON.stringify({ username, gender: gender || 'unknown' })
      const { error } = await supabase.from('announcement').upsert({
        id: toQueueId(peerId),
        text: queueData,
        active: true,
        createdAt: new Date().toISOString(),
      }, { onConflict: 'id' })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      try {
        await supabase.from('announcement').delete().eq('id', toQueueId(peerId))
      } catch {}
      return NextResponse.json({ success: true })
    }

    if (action === 'heartbeat' && peerId) {
      // Resetear timestamp del heartbeat
      const { error } = await supabase
        .from('announcement')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', toQueueId(peerId))

      if (error) return NextResponse.json({ error: 'No esta en la cola' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
