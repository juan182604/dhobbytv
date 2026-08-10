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

  return { user: { id: user.id, username: user.username, gender: user.gender, verified: user.verified, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin } }
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
    return { error: 'Tu cuenta ha sido baneada permanentemente' }
  }

  // Check suspension
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    const until = new Date(user.suspendedUntil).toLocaleString()
    return { error: `Tu cuenta está suspendida hasta: ${until}`, suspended: true, suspendedUntil: user.suspendedUntil }
  }

  // Clear expired suspension
  if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
    await db.user.update({ where: { id: user.id }, data: { suspendedUntil: null } })
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      gender: user.gender,
      verified: user.verified,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
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

  // No more auto-ban, admins handle it manually
  return { success: true }
}

// ==================== ADMIN MANAGEMENT ====================

export async function createAdmin(username: string, password: string, gender: string) {
  const existing = await db.user.findUnique({ where: { username } })
  if (existing) return { error: 'El nombre de usuario ya existe' }

  const hashedPassword = await hashPassword(password)
  const user = await db.user.create({
    data: { username, password: hashedPassword, gender, isAdmin: true, verified: true },
  })

  return { user: { id: user.id, username: user.username, gender: user.gender, isAdmin: true, isSuperAdmin: false } }
}

export async function deleteAdmin(username: string) {
  const user = await db.user.findUnique({ where: { username } })
  if (!user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes eliminar al Super Admin' }
  if (!user.isAdmin) return { error: 'Este usuario no es admin' }

  await db.report.deleteMany({ where: { OR: [{ reportedId: user.id }, { reporterId: user.id }] } })
  await db.ban.deleteMany({ where: { userId: user.id } })
  await db.user.delete({ where: { id: user.id } })

  return { success: true }
}

export async function listAdmins() {
  return db.user.findMany({
    where: { isAdmin: true },
    select: { id: true, username: true, gender: true, isSuperAdmin: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
}

// ==================== USER MANAGEMENT (BAN/SUSPEND) ====================

export async function banUser(userId: string, reason: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes banear al Super Admin' }
  if (user.isAdmin) return { error: 'No puedes banear a un admin' }

  await db.user.update({ where: { id: userId }, data: { banned: true } })
  await db.ban.create({ data: { userId, reason } })

  return { success: true }
}

export async function suspendUser(userId: string, hours: number, reason: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes suspender al Super Admin' }
  if (user.isAdmin) return { error: 'No puedes suspender a un admin' }

  const suspendedUntil = new Date()
  suspendedUntil.setHours(suspendedUntil.getHours() + hours)

  await db.user.update({
    where: { id: userId },
    data: { suspendedUntil },
  })

  return { success: true, suspendedUntil }
}

export async function unbanUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return { error: 'Usuario no encontrado' }

  await db.user.update({ where: { id: userId }, data: { banned: false, suspendedUntil: null } })
  await db.ban.deleteMany({ where: { userId } })

  return { success: true }
}

export async function unsuspendUser(userId: string) {
  await db.user.update({ where: { id: userId }, data: { suspendedUntil: null } })
  return { success: true }
}

// ==================== REPORTS ====================

export async function getUserReports(userId: string) {
  return db.report.findMany({
    where: { reportedId: userId },
    include: {
      reporter: { select: { username: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getReportedUsers() {
  const usersWithReports = await db.user.findMany({
    where: {
      verified: true,
      isAdmin: false,
      isSuperAdmin: false,
    },
    include: {
      _count: { select: { reports: true } },
      reports: {
        include: { reporter: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
      },
      bans: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Only return users who have reports
  return usersWithReports.filter((u) => u._count.reports > 0)
}

// ==================== ANNOUNCEMENTS ====================

export async function createAnnouncement(text: string) {
  // Deactivate all existing announcements
  await db.announcement.updateMany({ where: { active: true }, data: { active: false } })
  return db.announcement.create({ data: { text, active: true } })
}

export async function getActiveAnnouncement() {
  return db.announcement.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } })
}

export async function deleteAnnouncement(id: string) {
  return db.announcement.delete({ where: { id } })
}

export async function getAllAnnouncements() {
  return db.announcement.findMany({ orderBy: { createdAt: 'desc' } })
}

// ==================== STATS ====================

export async function getAdminStats() {
  const totalUsers = await db.user.count()
  const verifiedUsers = await db.user.count({ where: { verified: true } })
  const pendingUsers = await db.user.count({ where: { verified: false, isAdmin: false, isSuperAdmin: false } })
  const bannedUsers = await db.user.count({ where: { banned: true } })
  const suspendedUsers = await db.user.count({
    where: { suspendedUntil: { gt: new Date() } },
  })
  const totalReports = await db.report.count()
  const adminCount = await db.user.count({ where: { isAdmin: true } })

  return { totalUsers, verifiedUsers, pendingUsers, bannedUsers, suspendedUsers, totalReports, adminCount }
}

export async function getSuperAdminStats() {
  const totalUsers = await db.user.count()
  const verifiedUsers = await db.user.count({ where: { verified: true, isAdmin: false, isSuperAdmin: false } })
  const pendingUsers = await db.user.count({ where: { verified: false, isAdmin: false, isSuperAdmin: false } })
  const bannedUsers = await db.user.count({ where: { banned: true, isAdmin: false, isSuperAdmin: false } })
  const suspendedUsers = await db.user.count({ where: { suspendedUntil: { gt: new Date() }, isAdmin: false, isSuperAdmin: false } })
  const totalReports = await db.report.count()
  const adminCount = await db.user.count({ where: { isAdmin: true, isSuperAdmin: false } })
  const totalAnnouncements = await db.announcement.count()

  return { totalUsers, verifiedUsers, pendingUsers, bannedUsers, suspendedUsers, totalReports, adminCount, totalAnnouncements }
}
