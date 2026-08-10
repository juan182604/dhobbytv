import { NextRequest, NextResponse } from 'next/server'
import { banUser, getUserByUsername } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { userId, reason } = await request.json()
    if (!userId || !reason) {
      return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
    }
    const result = await banUser(userId, reason)
    if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}