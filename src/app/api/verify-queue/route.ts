import { NextResponse } from 'next/server'

// Cola de verificacion en memoria (sobrevive entre requests del mismo instancia)
// Para Vercel serverless, esto funciona dentro de la misma instancia
const queue = new Map<string, { peerId: string; username: string; gender: string; joinedAt: number; adminPeerId?: string }>()

// Limpiar expirados (5 min)
function cleanExpired() {
  const now = Date.now()
  queue.forEach((data, key) => {
    if (now - data.joinedAt > 300000) queue.delete(key)
  })
}

export async function GET() {
  cleanExpired()
  const list = [...queue.values()]
    .filter((d) => !d.adminPeerId) // solo los que no tienen admin asignado
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((d) => ({ peerId: d.peerId, username: d.username, gender: d.gender, timestamp: d.joinedAt }))
  return NextResponse.json({ queue: list })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, peerId, username, gender, targetPeerId, adminPeerId } = body

    if (action === 'join' && peerId && username) {
      queue.set(peerId, { peerId, username, gender: gender || 'unknown', joinedAt: Date.now() })
      return NextResponse.json({ success: true })
    }

    if (action === 'leave' && peerId) {
      queue.delete(peerId)
      return NextResponse.json({ success: true })
    }

    if (action === 'signal' && targetPeerId && adminPeerId) {
      const entry = queue.get(targetPeerId)
      if (entry) {
        entry.adminPeerId = adminPeerId
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'Usuario no esta en la cola' }, { status: 404 })
    }

    // Usuario consulta si un admin se conecto
    if (action === 'check' && peerId) {
      const entry = queue.get(peerId)
      if (entry?.adminPeerId) {
        queue.delete(peerId) // limpiar despues de leer
        return NextResponse.json({ adminPeerId: entry.adminPeerId })
      }
      return NextResponse.json({ adminPeerId: null })
    }

    // Heartbeat del usuario (mantenerse vivo en la cola)
    if (action === 'heartbeat' && peerId) {
      const entry = queue.get(peerId)
      if (entry) {
        entry.joinedAt = Date.now() // resetear timer
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ error: 'No esta en la cola' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
