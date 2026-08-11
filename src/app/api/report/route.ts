import { NextRequest, NextResponse } from 'next/server'
import { createReport } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { reportedUsername, reporterUsername, reason } = await request.json()

    if (!reportedUsername || !reporterUsername || !reason) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const result = await createReport(reportedUsername, reporterUsername, reason)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}