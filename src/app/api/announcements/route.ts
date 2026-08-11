import { NextRequest, NextResponse } from 'next/server'
import { createAnnouncement, getActiveAnnouncement, getAllAnnouncements, deleteAnnouncement } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')

    if (all === 'true') {
      const announcements = await getAllAnnouncements()
      return NextResponse.json({ announcements })
    }

    const announcement = await getActiveAnnouncement()
    return NextResponse.json({ announcement })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, action, id } = await request.json()

    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'Falta el ID' }, { status: 400 })
      await deleteAnnouncement(id)
      return NextResponse.json({ success: true })
    }

    if (!text) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 })
    const announcement = await createAnnouncement(text)
    return NextResponse.json({ success: true, announcement })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}