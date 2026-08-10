import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const existing = await db.user.findUnique({ where: { username: 'superadmin' } })
    if (existing) {
      await db.user.update({ where: { username: 'superadmin' }, data: { isSuperAdmin: true, isAdmin: true, verified: true } })
    } else {
      const hashedPassword = await bcrypt.hash('superadmin123', 12)
      await db.user.create({ data: { username: 'superadmin', password: hashedPassword, gender: 'Hombre', isAdmin: true, isSuperAdmin: true, verified: true } })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('setup-admin error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}