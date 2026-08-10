import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/db'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(username: string, password: string, gender: string) {
  const { data: existing } = await supabase.from('user').select('id').eq('username', username).single()
  if (existing) {
    return { error: 'El nombre de usuario ya existe' }
  }

  const hashedPassword = await hashPassword(password)
  const { data: user, error } = await supabase.from('user').insert({
    username,
    password: hashedPassword,
    gender,
  }).select('id, username, gender, verified, isAdmin, isSuperAdmin').single()

  if (error) return { error: error.message }
  return { user }
}

export async function loginUser(username: string, password: string) {
  const { data: user, error } = await supabase.from('user').select('*').eq('username', username).single()
  if (error || !user) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  const valid = await verifyPassword(password, user.password)
  if (!valid) {
    return { error: 'Usuario o contraseña incorrectos' }
  }

  if (user.banned) {
    return { error: 'Tu cuenta ha sido baneada permanentemente' }
  }

  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    const until = new Date(user.suspendedUntil).toLocaleString()
    return { error: `Tu cuenta está suspendida hasta: ${until}`, suspended: true, suspendedUntil: user.suspendedUntil }
  }

  if (user.suspendedUntil && new Date(user.suspendedUntil) <= new Date()) {
    await supabase.from('user').update({ suspendedUntil: null }).eq('id', user.id)
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
  const { error } = await supabase.from('user').update({ verified: true }).eq('id', userId)
  if (error) throw error
  return { success: true }
}

export async function deleteUser(userId: string) {
  await supabase.from('report').delete().eq('reportedId', userId)
  await supabase.from('report').delete().eq('reporterId', userId)
  await supabase.from('ban').delete().eq('userId', userId)
  const { error } = await supabase.from('user').delete().eq('id', userId)
  if (error) throw error
  return { success: true }
}

export async function getUserById(userId: string) {
  const { data } = await supabase.from('user').select('*').eq('id', userId).single()
  return data
}

export async function getUserByUsername(username: string) {
  const { data } = await supabase.from('user').select('*').eq('username', username).single()
  return data
}

export async function createReport(reportedUsername: string, reporterUsername: string, reason: string) {
  const { data: reported } = await supabase.from('user').select('id').eq('username', reportedUsername).single()
  const { data: reporter } = await supabase.from('user').select('id').eq('username', reporterUsername).single()
  if (!reported || !reporter) return { error: 'Usuario no encontrado' }

  const { error } = await supabase.from('report').insert({
    reportedId: reported.id,
    reporterId: reporter.id,
    reason,
  })
  if (error) return { error: error.message }
  return { success: true }
}

// ==================== ADMIN MANAGEMENT ====================

export async function createAdmin(username: string, password: string, gender: string) {
  const { data: existing } = await supabase.from('user').select('id').eq('username', username).single()
  if (existing) return { error: 'El nombre de usuario ya existe' }

  const hashedPassword = await hashPassword(password)
  const { data: user, error } = await supabase.from('user').insert({
    username,
    password: hashedPassword,
    gender,
    isAdmin: true,
    verified: true,
  }).select('id, username, gender, isAdmin, isSuperAdmin').single()

  if (error) return { error: error.message }
  return { user: { ...user, isAdmin: true, isSuperAdmin: false } }
}

export async function deleteAdmin(username: string) {
  const { data: user, error: findError } = await supabase.from('user').select('*').eq('username', username).single()
  if (findError || !user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes eliminar al Super Admin' }
  if (!user.isAdmin) return { error: 'Este usuario no es admin' }

  await supabase.from('report').delete().eq('reportedId', user.id)
  await supabase.from('report').delete().eq('reporterId', user.id)
  await supabase.from('ban').delete().eq('userId', user.id)
  await supabase.from('user').delete().eq('id', user.id)

  return { success: true }
}

export async function listAdmins() {
  const { data, error } = await supabase.from('user').select('id, username, gender, isSuperAdmin, createdAt').eq('isAdmin', true).order('createdAt', { ascending: true })
  if (error) return []
  return data || []
}

// ==================== USER MANAGEMENT (BAN/SUSPEND) ====================

export async function banUser(userId: string, reason: string) {
  const { data: user, error: findError } = await supabase.from('user').select('*').eq('id', userId).single()
  if (findError || !user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes banear al Super Admin' }
  if (user.isAdmin) return { error: 'No puedes banear a un admin' }

  await supabase.from('user').update({ banned: true }).eq('id', userId)
  await supabase.from('ban').insert({ userId, reason })

  return { success: true }
}

export async function suspendUser(userId: string, hours: number, reason: string) {
  const { data: user, error: findError } = await supabase.from('user').select('*').eq('id', userId).single()
  if (findError || !user) return { error: 'Usuario no encontrado' }
  if (user.isSuperAdmin) return { error: 'No puedes suspender al Super Admin' }
  if (user.isAdmin) return { error: 'No puedes suspender a un admin' }

  const suspendedUntil = new Date()
  suspendedUntil.setHours(suspendedUntil.getHours() + hours)

  await supabase.from('user').update({ suspendedUntil: suspendedUntil.toISOString() }).eq('id', userId)

  return { success: true, suspendedUntil }
}

export async function unbanUser(userId: string) {
  const { data: user, error: findError } = await supabase.from('user').select('*').eq('id', userId).single()
  if (findError || !user) return { error: 'Usuario no encontrado' }

  await supabase.from('user').update({ banned: false, suspendedUntil: null }).eq('id', userId)
  await supabase.from('ban').delete().eq('userId', userId)

  return { success: true }
}

export async function unsuspendUser(userId: string) {
  await supabase.from('user').update({ suspendedUntil: null }).eq('id', userId)
  return { success: true }
}

// ==================== REPORTS ====================

export async function getUserReports(userId: string) {
  const { data, error } = await supabase
    .from('report')
    .select('id, reportedId, reporterId, reason, createdAt, reporter:user!reporterId(username)')
    .eq('reportedId', userId)
    .order('createdAt', { ascending: false })
  if (error) return []
  return data || []
}

export async function getReportedUsers() {
  const { data: users, error } = await supabase
    .from('user')
    .select(`
      id, username, gender, verified, isAdmin, isSuperAdmin, banned, suspendedUntil, createdAt,
      reports:report!reportedId(id, reason, createdAt, reporterId),
      bans:ban!userId(id, reason, createdAt)
    `)
    .eq('verified', true)
    .eq('isAdmin', false)
    .eq('isSuperAdmin', false)
    .order('createdAt', { ascending: false })

  if (error) return []

  return (users || [])
    .filter((u: any) => u.reports && u.reports.length > 0)
    .map((u: any) => ({
      ...u,
      _count: { reports: u.reports.length },
    }))
}

// ==================== ANNOUNCEMENTS ====================

export async function createAnnouncement(text: string) {
  await supabase.from('announcement').update({ active: false }).eq('active', true)
  const { data, error } = await supabase.from('announcement').insert({ text, active: true }).select().single()
  if (error) throw error
  return data
}

export async function getActiveAnnouncement() {
  const { data } = await supabase.from('announcement').select('*').eq('active', true).order('createdAt', { ascending: false }).limit(1).single()
  return data
}

export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from('announcement').delete().eq('id', id)
  if (error) throw error
  return { success: true }
}

export async function getAllAnnouncements() {
  const { data, error } = await supabase.from('announcement').select('*').order('createdAt', { ascending: false })
  if (error) return []
  return data || []
}

// ==================== STATS ====================

export async function getAdminStats() {
  const { count: totalUsers } = await supabase.from('user').select('*', { count: 'exact', head: true })
  const { count: verifiedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('verified', true)
  const { count: pendingUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('verified', false).eq('isAdmin', false).eq('isSuperAdmin', false)
  const { count: bannedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('banned', true)
  const { count: suspendedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).gt('suspendedUntil', new Date().toISOString())
  const { count: totalReports } = await supabase.from('report').select('*', { count: 'exact', head: true })
  const { count: adminCount } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('isAdmin', true)

  return { totalUsers: totalUsers || 0, verifiedUsers: verifiedUsers || 0, pendingUsers: pendingUsers || 0, bannedUsers: bannedUsers || 0, suspendedUsers: suspendedUsers || 0, totalReports: totalReports || 0, adminCount: adminCount || 0 }
}

export async function getSuperAdminStats() {
  const { count: totalUsers } = await supabase.from('user').select('*', { count: 'exact', head: true })
  const { count: verifiedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('verified', true).eq('isAdmin', false).eq('isSuperAdmin', false)
  const { count: pendingUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('verified', false).eq('isAdmin', false).eq('isSuperAdmin', false)
  const { count: bannedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('banned', true).eq('isAdmin', false).eq('isSuperAdmin', false)
  const { count: suspendedUsers } = await supabase.from('user').select('*', { count: 'exact', head: true }).gt('suspendedUntil', new Date().toISOString()).eq('isAdmin', false).eq('isSuperAdmin', false)
  const { count: totalReports } = await supabase.from('report').select('*', { count: 'exact', head: true })
  const { count: adminCount } = await supabase.from('user').select('*', { count: 'exact', head: true }).eq('isAdmin', true).eq('isSuperAdmin', false)
  const { count: totalAnnouncements } = await supabase.from('announcement').select('*', { count: 'exact', head: true })

  return { totalUsers: totalUsers || 0, verifiedUsers: verifiedUsers || 0, pendingUsers: pendingUsers || 0, bannedUsers: bannedUsers || 0, suspendedUsers: suspendedUsers || 0, totalReports: totalReports || 0, adminCount: adminCount || 0, totalAnnouncements: totalAnnouncements || 0 }
}
