import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const result = await loginUser(username, password)
    if (result.error) {
      return NextResponse.json({ error: result.error, suspended: result.suspended, suspendedUntil: result.suspendedUntil }, { status: 401 })
    }

    return NextResponse.json({ user: result.user })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}