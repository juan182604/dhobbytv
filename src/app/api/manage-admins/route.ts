import { NextRequest, NextResponse } from 'next/server'
import { createAdmin, deleteAdmin, listAdmins, getUserByUsername } from '@/lib/auth'

export async function GET() {
 try {
    const admins = await listAdmins()
    return NextResponse.json({ admins })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password, gender } = await request.json()

    if (action === 'create') {
      if (!username || !password || !gender) {
        return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
      }
      const result = await createAdmin(username, password, gender)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true, admin: result.user })
    }

    if (action === 'delete') {
      if (!username) return NextResponse.json({ error: 'Falta el username' }, { status: 400 })
      const result = await deleteAdmin(username)
      if (result.error) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}