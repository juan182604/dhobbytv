import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "gender" TEXT NOT NULL,
        "verified" BOOLEAN NOT NULL DEFAULT false,
        "isAdmin" BOOLEAN NOT NULL DEFAULT false,
        "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
        "banned" BOOLEAN NOT NULL DEFAULT false,
        "suspendedUntil" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Report" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "reportedId" TEXT NOT NULL,
        "reporterId" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Ban" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "reason" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Ban_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)

    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Announcement" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "text" TEXT NOT NULL,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_reportedId_idx" ON "Report"("reportedId");`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Report_reporterId_idx" ON "Report"("reporterId");`)
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Ban_userId_idx" ON "Ban"("userId");`)

    return NextResponse.json({ success: true, message: 'Tablas creadas correctamente' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
