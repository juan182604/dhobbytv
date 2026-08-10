import { NextRequest, NextResponse } from 'next/server'
import { createUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password, gender } = await request.json()

    if (!username || !password || !gender) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: 'El usuario debe tener entre 3 y 20 caracteres' }, { status: 400 })
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 })
    }

    if (!['Hombre', 'Mujer', 'Trans'].includes(gender)) {
      return NextResponse.json({ error: 'Género no válido' }, { status: 400 })
    }

    const result = await createUser(username, password, gender)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ user: result.user }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}