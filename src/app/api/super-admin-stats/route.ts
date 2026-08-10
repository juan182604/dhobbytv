import { NextResponse } from 'next/server'
import { getSuperAdminStats } from '@/lib/auth'

export async function GET() {
  try {
    const stats = await getSuperAdminStats()
    return NextResponse.json(stats)
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}