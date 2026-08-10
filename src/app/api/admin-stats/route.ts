import { NextResponse } from 'next/server'
import { getAdminStats } from '@/lib/auth'

export async function GET() {
  try {
    const stats = await getAdminStats()
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}