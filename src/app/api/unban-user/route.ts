import { NextRequest, NextResponse } from 'next/server'
import { unbanUser, unsuspendUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, type } = await request.json()
    if (!userId) return NextResponse.json({ error: 'Falta el userId' }, { status: 400 })

    if (type === 'unban') {
      const result = await unbanUser(userId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    if (type === 'unsuspend') {
      const result = await unsuspendUser(userId)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}