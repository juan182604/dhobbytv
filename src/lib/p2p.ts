// ==================== P2P LAYER: Gun.js + PeerJS ====================
// Gun.js: presencia online, matchmaking, cola de verificacion (gratis, decentralizado)
// PeerJS: senalizacion WebRTC video/audio/chat (gratis, servidor en la nube)

import Peer, { DataConnection, MediaConnection } from 'peerjs'

// Gun relay URLs - multiples para fallback
export const GUN_RELAY = process.env.NEXT_PUBLIC_GUN_RELAY || 'https://dhobbytv-gun.onrender.com/gun'

// Relays en orden de prioridad: tu relay primero, luego publicos como fallback
const PUBLIC_RELAYS = [
  'https://dhobbytv-gun.onrender.com/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://peer.wallie.io/gun',
]

// ==================== GUN.JS ====================
let gunInstance: any = null

export async function getGun(): Promise<any> {
  if (gunInstance) return gunInstance
  const Gun = (await import('gun/gun')).default
  const peers: string[] = []
  // Usar tu relay principal
  if (GUN_RELAY && !peers.includes(GUN_RELAY)) peers.push(GUN_RELAY)
  // Agregar publicos como fallback
  PUBLIC_RELAYS.forEach(r => { if (!peers.includes(r)) peers.push(r) })
  console.log('[GUN] Conectando a relays:', peers)
  gunInstance = Gun({
    peers,
    localStorage: false,
    radisk: false,
  })
  return gunInstance
}

// Generar ID unico para PeerJS
export function genPeerId(username: string): string {
  const rand = Math.random().toString(36).substring(2, 8)
  return `dh_${username}_${rand}`
}

// Crear instancia PeerJS con multiples STUN/TURN para mejor conectividad
export function createPeer(peerId: string): Peer {
  return new Peer(peerId, {
    debug: 1, // 1 = errores y warnings para debug
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        {
          urls: 'turn:global.relay.metered.ca:80',
          username: 'e74a7c5c0e6b3b6e3a3c7e6d',
          credential: 'dK6R8qM2pL5nH7jE',
        },
        {
          urls: 'turn:global.relay.metered.ca:443',
          username: 'e74a7c5c0e6b3b6e3a3c7e6d',
          credential: 'dK6R8qM2pL5nH7jE',
        },
      ],
      iceCandidatePoolSize: 10,
    },
  })
}

// ==================== PRESENCIA ONLINE ====================
const heartbeatTimers: Map<string, ReturnType<typeof setInterval>> = new Map()

export function goOnline(gun: any, peerId: string, data: {
  username: string
  gender: string
  country: string
  countryCode: string
  verified: boolean
  isAdmin: boolean
}) {
  const node = gun.get(`dhobbytv/online/${peerId}`)
  const payload = { ...data, peerId, lastSeen: Date.now() }
  node.put(payload)
  console.log('[GUN] goOnline:', peerId)
  // Heartbeat cada 10s (mas frecuente para mejor precision)
  const timer = setInterval(() => {
    node.put({ ...payload, lastSeen: Date.now() })
  }, 10000)
  heartbeatTimers.set(peerId, timer)
}

export function goOffline(gun: any, peerId: string) {
  const timer = heartbeatTimers.get(peerId)
  if (timer) { clearInterval(timer); heartbeatTimers.delete(peerId) }
  gun.get(`dhobbytv/online/${peerId}`).put(null)
  console.log('[GUN] goOffline:', peerId)
}

// Obtener conteo online (usuarios con heartbeat en los ultimos 45s)
export function watchOnlineCount(gun: any, callback: (count: number) => void) {
  const counts = new Map<string, number>()
  let lastCallback = 0
  const cleanup = setInterval(() => {
    const now = Date.now()
    let count = 0
    counts.forEach((ts) => { if (now - ts < 45000) count++ })
    // Solo llamar callback si cambio o cada 10s minimo
    if (now - lastCallback > 10000) {
      lastCallback = now
      callback(count)
    }
  }, 3000)

  gun.get('dhobbytv/online').map().on((data: any, key: string) => {
    if (!data || !data.lastSeen) {
      counts.delete(key)
      return
    }
    counts.set(key, data.lastSeen)
  })

  return () => clearInterval(cleanup)
}

// ==================== MATCHMAKING ====================
export function joinSearching(gun: any, peerId: string, data: {
  username: string
  gender: string
  country: string
  countryCode: string
  hobbies: string[]
  countryFilter: string
}) {
  const searchData = {
    ...data,
    peerId,
    timestamp: Date.now(),
  }
  gun.get(`dhobbytv/searching/${peerId}`).put(searchData)
  console.log('[GUN] joinSearching:', peerId, 'filter:', data.countryFilter)
}

export function leaveSearching(gun: any, peerId: string) {
  gun.get(`dhobbytv/searching/${peerId}`).put(null)
  console.log('[GUN] leaveSearching:', peerId)
}

// Escuchar buscadores y encontrar match
export function watchForMatch(
  gun: any,
  myPeerId: string,
  myData: { countryFilter: string; hobbies: string[]; gender: string },
  onMatch: (match: any) => void
) {
  const handled = new Set<string>()
  let matchCount = 0

  const unsub = gun.get('dhobbytv/searching').map().on((data: any, key: string) => {
    if (!data || !data.peerId || data.peerId === myPeerId) return
    if (handled.has(data.peerId)) return
    const now = Date.now()
    // Expirado (90s en vez de 60s para dar mas tiempo al relay lento)
    if (now - (data.timestamp || 0) > 90000) return

    console.log('[GUN] Potential match:', data.username, 'country:', data.countryCode, 'filter:', myData.countryFilter)

    // Verificar compatibilidad de pais
    const myCountry = myData.countryFilter
    if (myCountry !== 'all' && data.countryCode !== myCountry && data.country !== myCountry) return

    // Calcular score de hobbies
    let score = 1
    if (myData.hobbies.length > 0 && data.hobbies?.length > 0) {
      const common = myData.hobbies.filter((h: string) => data.hobbies.includes(h))
      score += common.length * 5
    }
    if (myCountry !== 'all') score += 10

    if (score >= 1) {
      handled.add(data.peerId)
      matchCount++
      console.log('[GUN] MATCH #' + matchCount + ':', data.username)
      onMatch(data)
    }
  })

  return () => { handled.clear() }
}

// ==================== COLA DE VERIFICACION ====================
export function joinVerifyQueue(gun: any, peerId: string, data: {
  username: string
  gender: string
}) {
  gun.get(`dhobbytv/verify-queue/${peerId}`).put({
    ...data,
    peerId,
    timestamp: Date.now(),
  })
}

export function leaveVerifyQueue(gun: any, peerId: string) {
  gun.get(`dhobbytv/verify-queue/${peerId}`).put(null)
}

export function watchVerifyQueue(
  gun: any,
  callback: (queue: Array<{ peerId: string; username: string; gender: string; timestamp: number }>) => void
) {
  const items = new Map<string, any>()
  const cleanup = setInterval(() => {
    const now = Date.now()
    const valid: Array<any> = []
    items.forEach((data, key) => {
      if (data && now - (data.timestamp || 0) < 300000) { // 5 min timeout
        valid.push(data)
      } else if (data) {
        // Auto-limpiar expirados
        gun.get(`dhobbytv/verify-queue/${key}`).put(null)
      }
    })
    valid.sort((a, b) => a.timestamp - b.timestamp)
    callback(valid)
  }, 3000)

  gun.get('dhobbytv/verify-queue').map().on((data: any, key: string) => {
    if (!data || !data.peerId) {
      items.delete(key)
      return
    }
    items.set(key, data)
  })

  return () => clearInterval(cleanup)
}

// Signal al usuario que el admin se conecto (via Gun)
export function signalVerificationStart(gun: any, userPeerId: string, adminPeerId: string) {
  gun.get(`dhobbytv/verify-signal/${userPeerId}`).put({
    adminPeerId,
    timestamp: Date.now(),
  })
}

export function watchVerificationSignal(
  gun: any,
  myPeerId: string,
  callback: (adminPeerId: string) => void
) {
  gun.get(`dhobbytv/verify-signal/${myPeerId}`).on((data: any) => {
    if (data && data.adminPeerId && Date.now() - (data.timestamp || 0) < 60000) {
      callback(data.adminPeerId)
    }
  })
}

export function clearVerificationSignal(gun: any, peerId: string) {
  gun.get(`dhobbytv/verify-signal/${peerId}`).put(null)
}

// ==================== LIMPIEZA GLOBAL ====================
export function cleanupPeer(peer: Peer | null) {
  if (peer && !peer.destroyed) {
    try { peer.destroy() } catch {}
  }
}

export function stopStream(stream: MediaStream | null) {
  if (stream) stream.getTracks().forEach((t) => t.stop())
}
