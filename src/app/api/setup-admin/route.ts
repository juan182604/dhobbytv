import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const existing = await db.user.findUnique({ where: { username: 'admin' } })
    if (existing) {
      await db.user.update({
        where: { username: 'admin' },
        data: { isAdmin: true, verified: true },
      })
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      await db.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          gender: 'Hombre',
          isAdmin: true,
          verified: true,
        },
      })
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
