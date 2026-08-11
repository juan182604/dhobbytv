import { NextResponse } from 'next/server'
import { getReportedUsers } from '@/lib/auth'

export async function GET() {
 try {
    const users = await getReportedUsers()
    return NextResponse.json({ users })
  } catch {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}