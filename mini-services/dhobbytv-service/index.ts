import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Types
interface OnlineUser {
  socketId: string
  username: string
  gender: string
  country: string
  countryCode: string
  hobbies: string[]
  verified: boolean
  isAdmin: boolean
  searching: boolean
  pairedWith: string | null
  inVerification: boolean
}

interface VerificationQueueItem {
  socketId: string
  username: string
  gender: string
  joinedAt: number
}

// State
const onlineUsers = new Map<string, OnlineUser>()
const verificationQueue: VerificationQueueItem[] = []
const activeVerifications = new Map<string, string>() // adminSocketId -> userSocketId

// ==================== CONNECTION ====================
io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`)

  // ==================== USER GOES ONLINE ====================
  socket.on('user-online', (data: { username: string; gender: string; country: string; countryCode: string; verified: boolean; isAdmin: boolean }) => {
    const user: OnlineUser = {
      socketId: socket.id,
      username: data.username,
      gender: data.gender,
      country: data.country,
      countryCode: data.countryCode,
      hobbies: [],
      verified: data.verified,
      isAdmin: data.isAdmin,
      searching: false,
      pairedWith: null,
      inVerification: false,
    }
    onlineUsers.set(socket.id, user)
    io.emit('online-count', { count: onlineUsers.size })
    console.log(`[online] ${data.username} from ${data.country} (${onlineUsers.size} online)`)
  })

  // ==================== SEARCH FOR PARTNER ====================
  socket.on('search-partner', (data: { country: string; hobbies: string[] }) => {
    const user = onlineUsers.get(socket.id)
    if (!user || !user.verified || user.pairedWith) return

    user.searching = true
    user.hobbies = data.hobbies || []
    user.pairedWith = null

    // Find a matching partner
    let bestMatch: OnlineUser | null = null
    let bestScore = -1

    for (const [, candidate] of onlineUsers) {
      if (
        candidate.socketId === socket.id ||
        !candidate.searching ||
        !candidate.verified ||
        candidate.pairedWith ||
        candidate.inVerification
      ) continue

      let score = 0

      // Country match
      if (data.country === 'all' || candidate.countryCode === data.country || data.country === candidate.countryCode) {
        if (data.country !== 'all') score += 10
      } else if (data.country !== 'all') {
        continue // Skip if country filter doesn't match
      }

      // Hobby match
      if (user.hobbies.length > 0 && candidate.hobbies.length > 0) {
        const common = user.hobbies.filter(h => candidate.hobbies.includes(h))
        score += common.length * 5
      }

      // Prefer longer waiting
      score += 1

      if (score > bestScore) {
        bestScore = score
        bestMatch = candidate
      }
    }

    if (bestMatch) {
      // Pair them
      user.searching = false
      user.pairedWith = bestMatch.socketId
      bestMatch.searching = false
      bestMatch.pairedWith = socket.id

      // Notify both
      socket.emit('partner-found', {
        peerSocketId: bestMatch.socketId,
        username: bestMatch.username,
        gender: bestMatch.gender,
        country: bestMatch.country,
        countryCode: bestMatch.countryCode,
        signal: true,
      })

      bestMatch.socket && io.to(bestMatch.socketId).emit('partner-found', {
        peerSocketId: socket.id,
        username: user.username,
        gender: user.gender,
        country: user.country,
        countryCode: user.countryCode,
        signal: false,
      })

      console.log(`[paired] ${user.username} <-> ${bestMatch.username}`)
    } else {
      socket.emit('searching', { message: 'Buscando persona...' })
    }
  })

  // ==================== WEBRTC SIGNALING ====================
  socket.on('webrtc-offer', (data: { targetId: string; offer: RTCSessionDescriptionInit }) => {
    io.to(data.targetId).emit('webrtc-offer', {
      fromId: socket.id,
      offer: data.offer,
    })
  })

  socket.on('webrtc-answer', (data: { targetId: string; answer: RTCSessionDescriptionInit }) => {
    io.to(data.targetId).emit('webrtc-answer', {
      fromId: socket.id,
      answer: data.answer,
    })
  })

  socket.on('webrtc-ice-candidate', (data: { targetId: string; candidate: RTCIceCandidateInit }) => {
    io.to(data.targetId).emit('webrtc-ice-candidate', {
      fromId: socket.id,
      candidate: data.candidate,
    })
  })

  // ==================== NEXT / DISCONNECT PARTNER ====================
  socket.on('next-partner', () => {
    const user = onlineUsers.get(socket.id)
    if (!user || !user.pairedWith) return

    const partnerSocketId = user.pairedWith
    const partner = onlineUsers.get(partnerSocketId)

    if (partner) {
      partner.pairedWith = null
      partner.searching = false
      io.to(partnerSocketId).emit('partner-disconnected', { reason: 'partner_left' })
    }

    user.pairedWith = null
    user.searching = false
    console.log(`[next] ${user.username} clicked next`)
  })

  // ==================== STOP SEARCHING ====================
  socket.on('stop-searching', () => {
    const user = onlineUsers.get(socket.id)
    if (user) {
      user.searching = false
    }
  })

  // ==================== REPORT USER ====================
  socket.on('report-user', (data: { targetUsername: string; reason: string }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return
    console.log(`[report] ${user.username} reported ${data.targetUsername}: ${data.reason}`)
    // Reports are stored via API, this is just for real-time notification
  })

  // ==================== VERIFICATION QUEUE ====================
  socket.on('join-verification-queue', (data: { username: string; gender: string }) => {
    const user = onlineUsers.get(socket.id)
    if (!user) return

    user.inVerification = true
    const queueItem: VerificationQueueItem = {
      socketId: socket.id,
      username: data.username,
      gender: data.gender,
      joinedAt: Date.now(),
    }
    verificationQueue.push(queueItem)

    // Notify all admins
    broadcastVerificationQueue()
    socket.emit('in-verification-queue', { position: verificationQueue.length })
    console.log(`[verify-queue] ${data.username} joined queue (position ${verificationQueue.length})`)
  })

  // ==================== ADMIN: GET QUEUE ====================
  socket.on('get-verification-queue', () => {
    const user = onlineUsers.get(socket.id)
    if (!user || !user.isAdmin) return
    socket.emit('verification-queue', { queue: getSortedQueue() })
  })

  // ==================== ADMIN: JOIN VERIFICATION ====================
  socket.on('admin-join-verification', (data: { userSocketId: string }) => {
    const admin = onlineUsers.get(socket.id)
    if (!admin || !admin.isAdmin) return

    const queueIndex = verificationQueue.findIndex(q => q.socketId === data.userSocketId)
    if (queueIndex === -1) return

    const targetUser = onlineUsers.get(data.userSocketId)
    if (!targetUser) return

    // Remove from queue
    verificationQueue.splice(queueIndex, 1)
    activeVerifications.set(socket.id, data.userSocketId)

    // Notify user to start P2P
    io.to(data.userSocketId).emit('start-verification', {
      adminSocketId: socket.id,
      signal: true,
    })

    // Notify admin
    socket.emit('start-verification', {
      userSocketId: data.userSocketId,
      username: targetUser.username,
      gender: targetUser.gender,
      signal: false,
    })

    broadcastVerificationQueue()
    console.log(`[verify] Admin joined verification with ${targetUser.username}`)
  })

  // ==================== ADMIN: ACCEPT VERIFICATION ====================
  socket.on('admin-accept-verification', (data: { userSocketId: string }) => {
    const admin = onlineUsers.get(socket.id)
    if (!admin || !admin.isAdmin) return

    const targetUser = onlineUsers.get(data.userSocketId)
    if (targetUser) {
      targetUser.verified = true
      targetUser.inVerification = false
      io.to(data.userSocketId).emit('verification-accepted', {})
    }

    activeVerifications.delete(socket.id)
    broadcastVerificationQueue()
    console.log(`[verify] Admin accepted ${targetUser?.username}`)
  })

  // ==================== ADMIN: REJECT VERIFICATION ====================
  socket.on('admin-reject-verification', (data: { userSocketId: string }) => {
    const admin = onlineUsers.get(socket.id)
    if (!admin || !admin.isAdmin) return

    const targetUser = onlineUsers.get(data.userSocketId)
    if (targetUser) {
      targetUser.inVerification = false
      io.to(data.userSocketId).emit('verification-rejected', {})
    }

    activeVerifications.delete(socket.id)
    broadcastVerificationQueue()
    console.log(`[verify] Admin rejected ${targetUser?.username}`)
  })

  // ==================== DISCONNECT ====================
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id)
    if (!user) return

    // Notify partner if paired
    if (user.pairedWith) {
      const partner = onlineUsers.get(user.pairedWith)
      if (partner) {
        partner.pairedWith = null
        partner.searching = false
        io.to(user.pairedWith).emit('partner-disconnected', { reason: 'partner_left' })
      }
    }

    // Remove from verification queue
    const qIndex = verificationQueue.findIndex(q => q.socketId === socket.id)
    if (qIndex !== -1) {
      verificationQueue.splice(qIndex, 1)
      broadcastVerificationQueue()
    }

    // Remove from active verifications
    for (const [adminId, userId] of activeVerifications) {
      if (userId === socket.id) {
        io.to(adminId).emit('verification-user-disconnected', {})
        activeVerifications.delete(adminId)
      }
      if (adminId === socket.id) {
        const targetUser = onlineUsers.get(userId)
        if (targetUser) {
          targetUser.inVerification = false
          io.to(userId).emit('verification-admin-disconnected', {})
        }
        activeVerifications.delete(adminId)
      }
    }

    onlineUsers.delete(socket.id)
    io.emit('online-count', { count: onlineUsers.size })
    console.log(`[disconnect] ${user.username} (${onlineUsers.size} online)`)
  })
})

function getSortedQueue(): VerificationQueueItem[] {
  return [...verificationQueue].sort((a, b) => a.joinedAt - b.joinedAt)
}

function broadcastVerificationQueue() {
 const sorted = getSortedQueue()
  for (const [, user] of onlineUsers) {
    if (user.isAdmin) {
      io.to(user.socketId).emit('verification-queue', { queue: sorted })
    }
  }
}

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`dhobbytv service running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('Shutting down...')
  httpServer.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('Shutting down...')
  httpServer.close(() => process.exit(0))
})
