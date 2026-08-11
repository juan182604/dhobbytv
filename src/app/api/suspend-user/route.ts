import { NextRequest, NextResponse } from 'next/server'
import { suspendUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, hours, reason } = await request.json()
    if (!userId || !hours) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const result = await suspendUser(userId, Number(hours), reason || 'Suspendido por administrador')
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true, suspendedUntil: result.suspendedUntil })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}