import { NextRequest, NextResponse } from 'next/server'
import { getUserByUsername } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const username = request.nextUrl.searchParams.get('username')
    if (!username) return NextResponse.json({ error: 'Falta username' }, { status: 400 })
    const user = await getUserByUsername(username)
    if (!user) return NextResponse.json({ verified: false })
    return NextResponse.json({ verified: user.verified })
  } catch {
    return NextResponse.json({ verified: false })
  }
}
