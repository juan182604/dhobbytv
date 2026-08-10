import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(username: string, password: string, gender: string) {
  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return { error: 'El nombre de usuario ya existe' }
  }

  const hashedPassword = await hashPassword(password)
  const user = await db.user.create({
    data: {
      username,
      password: hashedPassword,
      gender,
    },
  })

  return { user: { id: user.id, username: user.username, gender: user.gender, verified: user.verified, isAdmin: user.isAdmin } }
}

export async function loginUser(username: string, password: string) {
  const user = await db.user.findUnique({ where: { username } })
  if (!user) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  if (user.banned) {
    return { error: 'Tu cuenta ha sido baneada' }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      gender: user.gender,
      verified: user.verified,
      isAdmin: user.isAdmin,
    },
  }
}

export async function setVerified(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { verified: true },
  })
}

export async function deleteUser(userId: string) {
  await db.report.deleteMany({ where: { OR: [{ reportedId: userId }, { reporterId: userId }] } })
  await db.ban.deleteMany({ where: { userId } })
  return db.user.delete({ where: { id: userId } })
}

export async function getUserById(userId: string) {
  return db.user.findUnique({ where: { id: userId } })
}

export async function getUserByUsername(username: string) {
  return db.user.findUnique({ where: { username } })
}

export async function createReport(reportedUsername: string, reporterUsername: string, reason: string) {
  const reported = await db.user.findUnique({ where: { username: reportedUsername } })
  const reporter = await db.user.findUnique({ where: { username: reporterUsername } })
  if (!reported || !reporter) return { error: 'Usuario no encontrado' }

  await db.report.create({
    data: {
      reportedId: reported.id,
      reporterId: reporter.id,
      reason,
    },
  })

  // Check if user has too many reports (auto-ban after 3)
  const reportCount = await db.report.count({ where: { reportedId: reported.id } })
  if (reportCount >= 3) {
    await db.user.update({ where: { id: reported.id }, data: { banned: true } })
    await db.ban.create({ data: { userId: reported.id, reason: `Auto-baneado por ${reportCount} reportes` } })
  }

  return { success: true }
}

export async function getAdminStats() {
  const totalUsers = await db.user.count()
  const verifiedUsers = await db.user.count({ where: { verified: true } })
  const pendingUsers = await db.user.count({ where: { verified: false } })
  const bannedUsers = await db.user.count({ where: { banned: true } })
  const totalReports = await db.report.count()

  return { totalUsers, verifiedUsers, pendingUsers, bannedUsers, totalReports }
}
