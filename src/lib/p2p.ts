// ==================== P2P LAYER: PeerJS ====================
// PeerJS: senalizacion WebRTC video/audio/chat (gratis, servidor en la nube)
// Presencia online y matchmaking: via Supabase API (/api/online-count, /api/matchmaking)

import Peer from 'peerjs'

// Generar ID unico para PeerJS
export function genPeerId(username: string): string {
  const rand = Math.random().toString(36).substring(2, 8)
  return 'dh_' + username + '_' + rand
}

// Crear instancia PeerJS con multiples STUN/TURN para mejor conectividad
export function createPeer(peerId: string): Peer {
  return new Peer(peerId, {
    debug: 1,
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

// Limpiar instancia PeerJS
export function cleanupPeer(peer: Peer | null) {
  if (peer && !peer.destroyed) {
    try { peer.destroy() } catch {}
  }
}

// Detener stream de media
export function stopStream(stream: MediaStream | null) {
  if (stream) stream.getTracks().forEach((t) => t.stop())
}
