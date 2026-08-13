import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/db'

// Presencia online usando tabla Announcement con prefijo ol_
// Cada entrada: id = "ol_{peerId}", text = JSON({username, gender, isAdmin})

const ONLINE_EXPIRE_MS = 60000 // 60 segundos sin heartbeat = offline
const PREFIX = 'ol_'

function toId(peerId: string) { return PREFIX + peerId }

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const cutoff = new Date(Date.now() - ONLINE_EXPIRE_MS).toISOString()
    const { searchParams } = new URL(request.url)
    const returnList = searchParams.get('list') === 'true'

    // Limpiar offline
    try {
      const { error: delErr } = await supabase
        .from('announcement')
        .delete()
        .like('id', PREFIX + '%')
        .lt('createdAt', cutoff)
      if (delErr) console.error('[ONLINE-COUNT] Cleanup error:', delErr.message)
    } catch (e) {
      console.error('[ONLINE-COUNT] Cleanup exception:', e)
    }

    if (returnList) {
      // Return full list of online users
      const { data, error } = await supabase
        .from('announcement')
        .select('id, text, createdAt')
        .like('id', PREFIX + '%')
        .eq('active', true)
        .gte('createdAt', cutoff)

      if (error) {
        console.error('[ONLINE-COUNT] List error:', error.message)
        return NextResponse.json({ users: [] }, { status: 500 })
      }

      const users = (data || []).map((d: any) => {
        const peerId = d.id.startsWith(PREFIX) ? d.id.slice(PREFIX.length) : null
        const info = typeof d.text === 'string' ? (() => { try { return JSON.parse(d.text) } catch { return {} } })() : (d.text || {})
        return {
          peerId,
          username: info.username || '',
          gender: info.gender || '',
          isAdmin: !!info.isAdmin,
          nickname: info.nickname || '',
          country: info.country || '',
          countryCode: info.countryCode || '',
        }
      }).filter((u: any) => u.peerId)

      return NextResponse.json({ users })
    }

    // Contar online
    const { count, error } = await supabase
      .from('announcement')
      .select('*', { count: 'exact', head: true })
      .like('id', PREFIX + '%')
      .eq('active', true)
      .gte('createdAt', cutoff)

    if (error) {
      console.error('[ONLINE-COUNT] Count error:', error.message)
      return NextResponse.json({ count: 0, error: error.message }, { status: 500 })
    }

    console.log('[ONLINE-COUNT] Current online:', count || 0)
    return NextResponse.json({ count: count || 0 })
  } catch (e) {
    console.error('[ONLINE-COUNT] GET exception:', e)
    return NextResponse.json({ count: 0 }, { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient()
    const body = await request.json()
    const { action, peerId, username, gender, isAdmin, country, countryCode, nickname } = body

    if (action === 'join' && peerId && username) {
      const id = toId(peerId)
      const info = JSON.stringify({ username, gender: gender || '', isAdmin: !!isAdmin, country: country || '', countryCode: countryCode || '', nickname: nickname || '' })

      // Primero intentar borrar si existe (limpieza)
      try {
        await supabase.from('announcement').delete().eq('id', id)
      } catch {}

      // Insertar nuevo
      const { data, error } = await supabase
        .from('announcement')
        .insert({
          id,
          text: info,
          active: true,
          createdAt: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) {
        console.error('[ONLINE-COUNT] Join insert error:', error.message, 'id:', id)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('[ONLINE-COUNT] User joined:', username, 'id:', id)
      return NextResponse.json({ success: true, id: data?.id })
    }

    if (action === 'heartbeat' && peerId) {
      const { error } = await supabase
        .from('announcement')
        .update({ createdAt: new Date().toISOString() })
        .eq('id', toId(peerId))

      if (error) {
        console.error('[ONLINE-COUNT] Heartbeat error for:', peerId, error.message)
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      const id = toId(peerId)
      try {
        await supabase.from('announcement').delete().eq('id', id)
        console.log('[ONLINE-COUNT] User left:', peerId)
      } catch (e) {
        console.error('[ONLINE-COUNT] Leave error:', e)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    console.error('[ONLINE-COUNT] POST exception:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
