import { NextResponse } from 'next/server'
import { banUser, unbanUser, suspendUser, unsuspendUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, userId, reason, hours } = body

    if (!userId) return NextResponse.json({ error: 'Falta userId' }, { status: 400 })

    if (action === 'ban') {
      const result = await banUser(userId, reason || 'Sin razon')
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'unban') {
      const result = await unbanUser(userId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (action === 'suspend') {
      const result = await suspendUser(userId, Number(hours) || 24, 'Suspendido por admin')
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true, suspendedUntil: result.suspendedUntil })
    }

    if (action === 'unsuspend') {
      const result = await unsuspendUser(userId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Accion no valida' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
