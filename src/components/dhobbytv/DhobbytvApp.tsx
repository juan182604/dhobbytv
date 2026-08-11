'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import Peer from 'peerjs'
import { useDhobbytvStore, AppView } from '@/store/useDhobbytvStore'
import { COUNTRIES, HOBBIES, getCountryFlag, getCountryName, getGenderLabel, getGenderShort } from '@/lib/countries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import { AdBanner, AdPopup } from './AdBanner'
import {
  getGun,
  genPeerId,
  createPeer,
  goOnline,
  goOffline,
  watchOnlineCount,
  joinSearching,
  leaveSearching,
  watchForMatch,
  joinVerifyQueue,
  leaveVerifyQueue,
  watchVerifyQueue,
  signalVerificationStart,
  watchVerificationSignal,
  clearVerificationSignal,
  cleanupPeer,
  stopStream,
} from '@/lib/p2p'

// ==================== VARIABLES GLOBALES P2P ====================
// Persisten entre cambios de vista sin re-render
let globalPeer: Peer | null = null
let globalStream: MediaStream | null = null
let globalGun: any = null
let globalPeerId: string | null = null

function setGlobalPeer(p: Peer | null) { globalPeer = p }
function setGlobalStream(s: MediaStream | null) { globalStream = s }
function setGlobalGun(g: any) { globalGun = g }
function setGlobalPeerId(id: string | null) { globalPeerId = id }

// ==================== LOGIN ====================
function LoginView() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setView = useDhobbytvStore((s) => s.setView)
  const setUser = useDhobbytvStore((s) => s.setUser)

  const handleLogin = async () => {
    if (!username || !password) return toast.error('Completa todos los campos')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
        if (data.suspendedUntil) toast.info(`Hasta: ${new Date(data.suspendedUntil).toLocaleString()}`)
        return
      }
      setUser(data.user)
      if (data.user.isSuperAdmin) setView('super-admin')
      else if (data.user.isAdmin) setView('admin')
      else if (!data.user.verified) setView('verification-pending')
      else setView('main')
    } catch {
      toast.error('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  const announcement = useDhobbytvStore((s) => s.announcement)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <AdBanner position="top" context="login" className="fixed top-0 left-0 right-0 z-40" />
      {announcement && <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-2 text-sm z-50">{announcement}</div>}
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-black tracking-tight">
            <span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span>
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">Conecta con personas que comparten tus intereses</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <Input type="password" placeholder="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <Button onClick={handleLogin} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-lg">
            {loading ? 'Entrando...' : 'Iniciar Sesion'}
          </Button>
          <div className="text-center">
            <button onClick={() => setView('register')} className="text-purple-400 hover:text-purple-300 text-sm underline">
              No tienes cuenta? Registrate aqui
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== REGISTER ====================
function RegisterView() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const setView = useDhobbytvStore((s) => s.setView)
  const setUser = useDhobbytvStore((s) => s.setUser)

  const handleRegister = async () => {
    if (!username || !password || !gender) return toast.error('Completa todos los campos')
    setLoading(true)
    try {
      const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, gender }),
      })
      const data = await res.json()
      if (data.error) return toast.error(data.error)
      setUser(data.user)
      setView('verification-pending')
      toast.success('Cuenta creada! Verificate para empezar a chatear')
    } catch {
      toast.error('Error de conexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <AdBanner position="top" context="login" className="fixed top-0 left-0 right-0 z-40" />
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-black">
            <span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span>
          </CardTitle>
          <p className="text-gray-400 text-sm">Crea tu cuenta</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Usuario (3-20 caracteres)" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" />
          <Input type="password" placeholder="Contrasena (minimo 4 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" />
          <div>
            <p className="text-gray-300 text-sm mb-2">Genero:</p>
            <div className="grid grid-cols-3 gap-2">
              {['Hombre', 'Mujer', 'Trans'].map((g) => (
                <button key={g} onClick={() => setGender(g)} className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all ${gender === g ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'}`}>
                  {getGenderLabel(g)}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleRegister} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg">
            {loading ? 'Creando...' : 'Registrarse'}
          </Button>
          <div className="text-center">
            <button onClick={() => setView('login')} className="text-purple-400 hover:text-purple-300 text-sm underline">
              Ya tienes cuenta? Inicia sesion
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== VERIFICATION PENDING (boton verificar) ====================
function VerificationPendingView() {
  const user = useDhobbytvStore((s) => s.user)
  const setView = useDhobbytvStore((s) => s.setView)

  const startVerification = async () => {
    setView('verification')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white text-center">
        <CardContent className="pt-8 pb-8 space-y-5">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-bold">Verificacion de Edad Requerida</h2>
          <p className="text-gray-400">Necesitas verificar que eres mayor de edad para usar dhobbytv. La verificacion es por video en vivo con un administrador. Solo se vera tu camara, el admin no muestra la suya.</p>
          <p className="text-yellow-400 text-sm font-medium">Prepara tu documento de identificacion</p>
          <Button onClick={startVerification} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-lg">
            Verificar
          </Button>
          <Button variant="outline" className="text-gray-400 border-gray-600" onClick={() => { useDhobbytvStore.getState().setUser(null); setView('login') }}>Salir</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== VERIFICATION WAITING (en cola, camara lista, esperando admin via API + PeerJS) ====================
function VerificationView() {
  const user = useDhobbytvStore((s) => s.user)
  const [status, setStatus] = useState<'init' | 'waiting' | 'error'>('init')
  const [position, setPosition] = useState(0)
  const [cameraReady, setCameraReady] = useState(false)
  const peerIdRef = useRef<string>('')
  const localVideoRef = useRef<HTMLVideoElement>(null)

  // Mostrar preview del stream en el video local
  // Usamos un polling corto porque globalStream es una variable global mutable (no estado React)
  const streamCheckRef = useRef<ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    streamCheckRef.current = setInterval(() => {
      if (localVideoRef.current && globalStream) {
        if (localVideoRef.current.srcObject !== globalStream) {
          localVideoRef.current.srcObject = globalStream
        }
        setCameraReady(true)
        if (streamCheckRef.current) clearInterval(streamCheckRef.current)
      }
    }, 300)
    return () => { if (streamCheckRef.current) clearInterval(streamCheckRef.current) }
  }, [])

  useEffect(() => {
    let mounted = true
    let checkInterval: ReturnType<typeof setInterval>
    let heartbeatInterval: ReturnType<typeof setInterval>

    const setup = async () => {
      // 1. Crear PeerJS (sin Gun.js)
      const peerId = genPeerId(user!.username)
      peerIdRef.current = peerId
      setGlobalPeerId(peerId)
      const peer = createPeer(peerId)
      setGlobalPeer(peer)

      peer.on('error', (err) => {
        console.error('PeerJS error:', err)
        if (mounted) setStatus('error')
      })

      peer.on('open', async () => {
        if (!mounted) return

        // 2. Obtener camara
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          if (!mounted) { stopStream(stream); return }
          setGlobalStream(stream)
        } catch {
          if (mounted) { toast.error('No se pudo acceder a la camara'); setStatus('error') }
          return
        }

        // 3. Agregarse a la cola via API
        try {
          await fetch('/api/verify-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join', peerId, username: user!.username, gender: user!.gender }),
          })
        } catch {}

        if (!mounted) return
        setStatus('waiting')

        // 4. Heartbeat cada 30s para mantenerse en la cola
        heartbeatInterval = setInterval(() => {
          fetch('/api/verify-queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'heartbeat', peerId }),
          }).catch(() => {})
        }, 30000)

        // 5. Poll cada 3s para ver si un admin se conecto
        checkInterval = setInterval(async () => {
          if (!mounted) return
          try {
            const res = await fetch('/api/verify-queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'check', peerId }),
            })
            const data = await res.json()
            if (data.adminPeerId && mounted) {
              // Admin se conecto - pasar a video
              useDhobbytvStore.getState().setVerificationAdminPeerId(data.adminPeerId)
              clearInterval(checkInterval)
              clearInterval(heartbeatInterval)
              useDhobbytvStore.getState().setView('verification-video')
            }
          } catch {}

          // Actualizar posicion
          try {
            const qRes = await fetch('/api/verify-queue')
            const qData = await qRes.json()
            const idx = (qData.queue || []).findIndex((item: any) => item.peerId === peerId)
            setPosition(idx >= 0 ? idx + 1 : 0)
          } catch {}
        }, 3000)
      })
    }

    setup()

    return () => {
      mounted = false
      clearInterval(checkInterval)
      clearInterval(heartbeatInterval)
      // Salir de la cola via API
      if (peerIdRef.current) {
        fetch('/api/verify-queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', peerId: peerIdRef.current }),
        }).catch(() => {})
      }
      stopStream(globalStream)
      setGlobalStream(null)
    }
  }, [])

  const handleExit = () => {
    if (peerIdRef.current) {
      fetch('/api/verify-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave', peerId: peerIdRef.current }),
      }).catch(() => {})
    }
    stopStream(globalStream)
    setGlobalStream(null)
    cleanupPeer(globalPeer)
    setGlobalPeer(null)
    setGlobalPeerId(null)
    useDhobbytvStore.getState().setView('verification-pending')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-yellow-400 text-sm ml-2">VERIFICACION</span></h1>
          <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleExit}>Cancelar</Button>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        {/* Preview de camara del usuario */}
        <div className="relative w-full max-w-md rounded-xl overflow-hidden border-2 border-green-500 shadow-lg shadow-green-500/20 bg-black" style={{ aspectRatio: '4/3' }}>
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                {status === 'init' ? (
                  <>
                    <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-300 text-sm">Activando camara...</p>
                  </>
                ) : status === 'error' ? (
                  <>
                    <div className="text-3xl">📷</div>
                    <p className="text-red-400 text-sm">No se pudo acceder a la camara</p>
                  </>
                ) : null}
              </div>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />{cameraReady ? 'CAMARA ACTIVA' : 'CONECTANDO...'}
          </div>
        </div>

        {/* Info de estado */}
        <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-center">
          <CardContent className="pt-6 pb-6 space-y-3">
            {status === 'init' && (
              <div className="flex items-center justify-center gap-2 text-blue-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                Conectando al servidor P2P...
              </div>
            )}
            {status === 'waiting' && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  En cola de verificacion
                </div>
                {position > 0 && <p className="text-gray-300">Posicion: <span className="text-purple-400 font-bold">#{position}</span></p>}
                {position === 0 && <p className="text-purple-400 font-medium">Eres el siguiente!</p>}
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  Error de conexion
                </div>
                <p className="text-gray-500 text-xs">Asegurate de tener camara y buena conexion</p>
              </div>
            )}
            <p className="text-yellow-400 text-sm font-medium">Prepara tu identificacion</p>
            <p className="text-gray-500 text-xs">Cuando un administrador se conecte, se iniciara la verificacion por video</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

// ==================== VERIFICATION VIDEO (usuario - P2P con admin via PeerJS) ====================
function VerificationVideoView() {
  const user = useDhobbytvStore((s) => s.user)
  const verificationAdminPeerId = useDhobbytvStore((s) => s.verificationAdminPeerId)
  const verificationMessages = useDhobbytvStore((s) => s.verificationMessages)
  const addVerificationMessage = useDhobbytvStore((s) => s.addVerificationMessage)

  const [statusMsg, setStatusMsg] = useState('Conectando con administrador...')
  const [chatInput, setChatInput] = useState('')

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const dataConnRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [verificationMessages])

  useEffect(() => {
    let mounted = true

    // Mostrar video local
    if (localVideoRef.current && globalStream) {
      localVideoRef.current.srcObject = globalStream
    }

    if (!globalPeer || !verificationAdminPeerId) {
      setStatusMsg('Error: no se encontro la conexion. Volviendo...')
      setTimeout(() => { if (mounted) useDhobbytvStore.getState().setView('verification') }, 2000)
      return () => { mounted = false }
    }

    // 1. Conectar data channel con el admin (chat)
    const dataConn = globalPeer.connect(verificationAdminPeerId, { reliable: true })
    dataConnRef.current = dataConn

    dataConn.on('open', () => {
      if (!mounted) return
      setStatusMsg('Conectado con admin. Muestra tu identificacion.')
      dataConn.send(JSON.stringify({ type: 'verify-user-info', username: user?.username, gender: user?.gender }))
      addVerificationMessage('Sistema', 'Conectado con el administrador. Puedes escribir mensajes abajo.')
    })

    dataConn.on('data', (raw: any) => {
      if (!mounted) return
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (msg.type === 'chat') {
          addVerificationMessage('Admin', msg.text)
        } else if (msg.type === 'verify-accepted') {
          toast.success('Has sido verificado!')
          const currentUser = useDhobbytvStore.getState().user
          if (currentUser) {
            useDhobbytvStore.getState().setUser({ ...currentUser, verified: true })
            fetch('/api/verify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser.username }) })
          }
          setTimeout(() => { useDhobbytvStore.getState().setView('main') }, 1000)
        } else if (msg.type === 'verify-rejected') {
          toast.error('Verificacion rechazada.')
          const currentUser = useDhobbytvStore.getState().user
          if (currentUser) fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentUser.username }) })
          setTimeout(() => { useDhobbytvStore.getState().setUser(null); useDhobbytvStore.getState().setView('login') }, 1000)
        }
      } catch {
        // texto plano
        addVerificationMessage('Admin', String(raw))
      }
    })

    // 2. Recibir llamada del admin (video) - el admin es quien llama
    const handleCall = (call: any) => {
      if (!mounted || !globalStream) return
      call.answer(globalStream)
      call.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current && mounted) {
          remoteVideoRef.current.srcObject = remoteStream
          // Ocultar placeholder cuando llega video
          const ph = document.getElementById('remote-video-placeholder')
          if (ph) ph.style.opacity = '0'
        }
      })
    }

    globalPeer.on('call', handleCall)

    return () => {
      mounted = false
      if (dataConnRef.current) try { dataConnRef.current.close() } catch {}
    }
  }, [])

  const handleSendMessage = () => {
    if (!chatInput.trim() || !dataConnRef.current) return
    dataConnRef.current.send(JSON.stringify({ type: 'chat', text: chatInput }))
    addVerificationMessage(user?.username || 'Tu', chatInput)
    setChatInput('')
  }

  const handleExit = () => {
    if (dataConnRef.current) try { dataConnRef.current.close() } catch {}
    stopStream(globalStream)
    setGlobalStream(null)
    setGlobalPeer(null)
    setGlobalPeerId(null)
    useDhobbytvStore.getState().setView('verification-pending')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-yellow-400 text-sm ml-2">VERIFICACION</span></h1>
          <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleExit}>Salir</Button>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">Administrador</span>
              <Badge className="bg-blue-600">STAFF</Badge>
            </div>
            <p className="text-yellow-400 text-sm">Muestra tu identificacion por camara</p>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-0">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div id="remote-video-placeholder" className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Esperando video del administrador...</p>
              </div>
            </div>
            <div className="absolute bottom-3 right-3 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-green-500 shadow-lg">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-3 left-3 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />TU CAMARA
            </div>
          </div>
          <p className="text-center text-gray-300 text-sm">{statusMsg}</p>
          <div className="bg-gray-900 rounded-lg h-32 overflow-y-auto p-3 space-y-1">
            {verificationMessages.map((msg, i) => (
              <p key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-purple-400 italic' : msg.from === 'Admin' ? 'text-blue-400' : 'text-green-400'}`}>
                <span className="font-medium">{msg.from}:</span> {msg.text}
              </p>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Escribe un mensaje..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="bg-gray-800 border-gray-700 text-white flex-1" />
            <Button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700">Enviar</Button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ==================== ADMIN VERIFICATION P2P (admin side) ====================
function AdminVerificationView() {
  const user = useDhobbytvStore((s) => s.user)
  const verificationTarget = useDhobbytvStore((s) => s.verificationTarget)
  const verificationMessages = useDhobbytvStore((s) => s.verificationMessages)
  const addVerificationMessage = useDhobbytvStore((s) => s.addVerificationMessage)

  const [adminCameraOn, setAdminCameraOn] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [statusMsg, setStatusMsg] = useState('Conectando con usuario...')

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const dataConnRef = useRef<any>(null)
  const mediaCallRef = useRef<any>(null)
  const adminStreamRef = useRef<MediaStream | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [verificationMessages])

  useEffect(() => {
    if (!verificationTarget || !globalPeer) return
    let mounted = true

    setStatusMsg('Conectando con ' + verificationTarget.username + '...')

    // 1. Conectar data channel con el usuario
    const dataConn = globalPeer.connect(verificationTarget.peerId, { reliable: true })
    dataConnRef.current = dataConn

    dataConn.on('open', () => {
      if (!mounted) return
      setStatusMsg('Conectado. Esperando video del usuario...')
    })

    dataConn.on('data', (raw: any) => {
      if (!mounted) return
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (msg.type === 'chat') {
          addVerificationMessage(verificationTarget.username, msg.text)
        } else if (msg.type === 'verify-user-info') {
          setStatusMsg(`Conectado con ${msg.username}. Esperando video...`)
        }
      } catch {
        addVerificationMessage(verificationTarget.username, String(raw))
      }
    })

    // 2. Llamar al usuario (video) - admin inicia la llamada
    const makeCall = async () => {
      if (!globalPeer || !verificationTarget) return
      // Pedir camara/micro del admin para que la llamada WebRTC tenga tracks
      let callStream = adminStreamRef.current
      if (!callStream) {
        try {
          callStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          adminStreamRef.current = callStream
          if (localVideoRef.current) localVideoRef.current.srcObject = callStream
          setAdminCameraOn(true)
        } catch {
          // Si no hay camara, usar stream de audio solo para que el mic funcione
          try {
            callStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
            adminStreamRef.current = callStream
          } catch {
            callStream = new MediaStream()
          }
        }
      }
      const call = globalPeer.call(verificationTarget.peerId, callStream)
      mediaCallRef.current = call

      call.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current && mounted) {
          remoteVideoRef.current.srcObject = remoteStream
          setStatusMsg('Conectado con ' + verificationTarget.username + '. Revisa su documento.')
        }
      })

      call.on('close', () => {
        if (mounted) {
          toast.error('El usuario se desconecto')
          handleBack()
        }
      })
    }

    // Esperar un poco y luego hacer la llamada de video
    setTimeout(makeCall, 1000)

    return () => {
      mounted = false
      try { dataConnRef.current?.close() } catch {}
      try { mediaCallRef.current?.close() } catch {}
    }
  }, [])

  const toggleAdminCamera = async () => {
    if (adminCameraOn) {
      // Apagar camara: parar tracks de video, mantener audio
      const stream = adminStreamRef.current
      if (stream) {
        stream.getVideoTracks().forEach(t => t.stop())
        // Reemplazar video track por track mudo en la llamada
        try {
          const pc = mediaCallRef.current?.peerConnection
          if (pc) {
            const senders = pc.getSenders()
            senders.forEach(s => {
              if (s.track?.kind === 'video') {
                const emptyStream = new MediaStream()
                const blackCanvas = document.createElement('canvas')
                blackCanvas.width = 2; blackCanvas.height = 2
                const ctx = blackCanvas.getContext('2d')!.fillRect(0, 0, 2, 2)
                const blackTrack = emptyStream.captureStream().getVideoTracks()[0]
                s.replaceTrack(blackTrack)
              }
            })
          }
        } catch {}
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null
      setAdminCameraOn(false)
      return
    }

    // Encender camara: agregar video al stream existente
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const existingStream = adminStreamRef.current
      if (existingStream) {
        videoStream.getVideoTracks().forEach(t => existingStream.addTrack(t))
        // No parar el audio stream
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => new MediaStream())
        const combined = new MediaStream([...audioStream.getTracks(), ...videoStream.getVideoTracks()])
        adminStreamRef.current = combined
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = adminStreamRef.current
      setAdminCameraOn(true)
      // Reemplazar video track en la llamada
      try {
        const pc = mediaCallRef.current?.peerConnection
        if (pc) {
          const senders = pc.getSenders()
          const newTrack = adminStreamRef.current?.getVideoTracks()[0]
          senders.forEach(s => {
            if (s.track?.kind === 'video' && newTrack) s.replaceTrack(newTrack)
          })
        }
      } catch {}
    } catch {
      toast.error('No se pudo acceder a la camara')
    }
  }

  const handleAccept = () => {
    const dataConn = dataConnRef.current
    if (dataConn && dataConn.open) {
      dataConn.send(JSON.stringify({ type: 'verify-accepted' }))
    }
    // Tambien actualizar via API
    if (verificationTarget.username) {
      fetch('/api/pending-users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-username', username: verificationTarget.username }),
      })
    }
    toast.success('Usuario verificado')
    handleBack()
  }

  const handleReject = () => {
    const dataConn = dataConnRef.current
    if (dataConn && dataConn.open) {
      dataConn.send(JSON.stringify({ type: 'verify-rejected' }))
    }
    if (verificationTarget.username) {
      fetch('/api/pending-users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject-username', username: verificationTarget.username }),
      })
    }
    toast.error('Usuario rechazado')
    handleBack()
  }

  const handleBack = () => {
    try { dataConnRef.current?.close() } catch {}
    try { mediaCallRef.current?.close() } catch {}
    stopStream(adminStreamRef.current)
    adminStreamRef.current = null
    dataConnRef.current = null
    mediaCallRef.current = null
    useDhobbytvStore.getState().setVerificationTarget(null)
    useDhobbytvStore.getState().clearVerificationMessages()
    useDhobbytvStore.getState().setView('admin')
  }

  if (!verificationTarget) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-yellow-400 text-sm ml-2">VERIFICACION</span></h1>
          <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleBack}>Volver al panel</Button>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <span>{getGenderShort(verificationTarget.gender)}</span>
              <span className="font-medium">{verificationTarget.username}</span>
              <Badge className="bg-yellow-600">NO VERIFICADO</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className={adminCameraOn ? 'text-red-400 border-red-400' : 'text-gray-400'} onClick={toggleAdminCamera}>
                {adminCameraOn ? 'Apagar mi camara' : 'Prender mi camara'}
              </Button>
            </div>
          </div>
          <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-0">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-3 right-3 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg bg-gray-900">
              {adminCameraOn ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><div className="text-center"><div className="text-2xl">🔇</div><p className="text-xs text-gray-400 mt-1">Camara apagada</p></div></div>
              )}
            </div>
            <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {verificationTarget.username}
            </div>
          </div>
          <p className="text-center text-gray-300 text-sm">{statusMsg}</p>
          <div className="bg-gray-900 rounded-lg h-32 overflow-y-auto p-3 space-y-1">
            {verificationMessages.map((msg, i) => (
              <p key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-purple-400 italic' : msg.from === user?.username ? 'text-blue-400' : 'text-green-400'}`}>
                <span className="font-medium">{msg.from}:</span> {msg.text}
              </p>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex gap-2">
            <Input placeholder="Escribe un mensaje..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (() => { if (!chatInput.trim() || !dataConnRef.current) return; dataConnRef.current.send(JSON.stringify({ type: 'chat', text: chatInput })); addVerificationMessage(user?.username || 'Admin', chatInput); setChatInput('') })()} className="bg-gray-800 border-gray-700 text-white flex-1" />
            <Button onClick={() => { if (!chatInput.trim() || !dataConnRef.current) return; dataConnRef.current.send(JSON.stringify({ type: 'chat', text: chatInput })); addVerificationMessage(user?.username || 'Admin', chatInput); setChatInput('') }} className="bg-purple-600 hover:bg-purple-700">Enviar</Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700">Aceptar (Verificar)</Button>
            <Button onClick={handleReject} className="flex-1 bg-red-600 hover:bg-red-700">Rechazar (Eliminar)</Button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ==================== ADMIN VIEW ====================
function AdminView() {
  const user = useDhobbytvStore((s) => s.user)
  const setVerificationTarget = useDhobbytvStore((s) => s.setVerificationTarget)
  const clearVerificationMessages = useDhobbytvStore((s) => s.clearVerificationMessages)

  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [reportedUsers, setReportedUsers] = useState<any[]>([])
  const [videoQueue, setVideoQueue] = useState<any[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const [peerReady, setPeerReady] = useState(false)

  const loadAdminData = async () => {
    try {
      const [pendingRes, reportedRes, queueRes] = await Promise.all([
        fetch('/api/pending-users').then((r) => r.json()),
        fetch('/api/reported-users').then((r) => r.json()).catch(() => ({ users: [] })),
        fetch('/api/verify-queue').then((r) => r.json()),
      ])
      if (pendingRes.users) setPendingUsers(pendingRes.users)
      if (reportedRes.users) setReportedUsers(reportedRes.users)
      if (queueRes.queue) setVideoQueue(queueRes.queue)
    } catch {}
  }

  // PeerJS setup para admin (sin Gun.js para cola)
  // NOTA: No destruimos el peer al desmontar porque puede volver de admin-verification
  useEffect(() => {
    let mounted = true
    let unsubOnline: (() => void) | null = null

    // Si ya hay un peer activo, reutilizarlo
    if (globalPeer && globalPeerId && !globalPeer.destroyed) {
      setPeerReady(true)
      if (globalGun) {
        unsubOnline = watchOnlineCount(globalGun, (count) => { if (mounted) setOnlineCount(count) })
      }
    } else {
      const setup = async () => {
        const gun = await getGun()
        if (!mounted) return
        setGlobalGun(gun)

        const peerId = genPeerId(user!.username + '_admin')
        setGlobalPeerId(peerId)
        const peer = createPeer(peerId)
        setGlobalPeer(peer)

        peer.on('open', () => {
          if (!mounted) return
          setPeerReady(true)
          goOnline(gun, peerId, { username: user!.username, gender: user!.gender, country: '', countryCode: '', verified: true, isAdmin: true })
        })

        peer.on('error', () => { if (mounted) setPeerReady(false) })

        // Escuchar conteo online (Gun.js)
        unsubOnline = watchOnlineCount(gun, (count) => { if (mounted) setOnlineCount(count) })
      }

      setup()
    }

    loadAdminData()
    const refreshInterval = setInterval(loadAdminData, 5000) // cada 5s para cola rapida

    return () => {
      mounted = false
      clearInterval(refreshInterval)
      // NO destruimos peer/gun aqui - se reutilizan si volvemos rapido
    }
  }, [])

  const handleJoinVerification = async (target: any) => {
    if (!globalPeer) {
      toast.error('PeerJS no esta listo')
      return
    }

    // Signal al usuario via API que el admin se conecto
    await fetch('/api/verify-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signal', targetPeerId: target.peerId, adminPeerId: globalPeer!.id }),
    })

    // Esperar un momento para que el usuario reciba la signal
    await new Promise((r) => setTimeout(r, 1500))

    setVerificationTarget({ peerId: target.peerId, username: target.username, gender: target.gender })
    clearVerificationMessages()
    useDhobbytvStore.getState().setView('admin-verification')
  }

  const [banDialog, setBanDialog] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; username: string } | null>(null)
  const [suspendHours, setSuspendHours] = useState('24')
  const [selectedReportedUser, setSelectedReportedUser] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAdminData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleBan = async () => {
    if (!banDialog) return
    await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ban', userId: banDialog.userId, reason: banReason }) })
    toast.success(`${banDialog.username} baneado`); setBanDialog(null); setBanReason(''); loadAdminData()
  }
  const handleUnban = async (userId: string) => {
    await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unban', userId }) })
    toast.success('Desbaneado'); loadAdminData()
  }
  const handleSuspend = async () => {
    if (!suspendDialog) return
    await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suspend', userId: suspendDialog.userId, hours: Number(suspendHours) }) })
    toast.success(`${suspendDialog.username} suspendido`); setSuspendDialog(null); loadAdminData()
  }
  const handleUnsuspend = async (userId: string) => {
    await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsuspend', userId }) })
    toast.success('Suspension quitada'); loadAdminData()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-blue-400 text-sm ml-2">ADMIN</span></h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleRefresh} disabled={refreshing}>
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </Button>
            <Badge variant="outline" className={peerReady ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}>{peerReady ? 'P2P Activo' : 'P2P Inactivo'}</Badge>
            <Badge variant="outline" className="text-green-400 border-green-400 text-xs">{onlineCount} online</Badge>
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => { cleanupPeer(globalPeer); setGlobalPeer(null); if (globalPeerId && globalGun) goOffline(globalGun, globalPeerId); useDhobbytvStore.getState().reset(); useDhobbytvStore.getState().setView('login') }}>Salir</Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="pending">
          <TabsList className="bg-gray-900 mb-4">
            <TabsTrigger value="pending" className="data-[state=active]:bg-purple-600">Pendientes ({pendingUsers.length})</TabsTrigger>
            <TabsTrigger value="video-queue" className="data-[state=active]:bg-purple-600">Video Queue ({videoQueue.length})</TabsTrigger>
            <TabsTrigger value="reported" className="data-[state=active]:bg-purple-600">Reportados ({reportedUsers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Pendientes - Verificacion Directa</CardTitle><CardDescription className="text-gray-400">Se actualiza cada 5s. Verifica sin video.</CardDescription></CardHeader>
              <CardContent><ScrollArea className="max-h-[600px]"><div className="space-y-2">
                {pendingUsers.map((u: any) => { const mA = Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 60000); const isNew = mA < 10; return (
                  <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${isNew ? 'bg-yellow-900/20 border-yellow-800' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center gap-3"><span className="text-lg">{getGenderShort(u.gender)}</span><div><div className="flex items-center gap-2"><p className="font-medium text-sm">{u.username}</p>{isNew && <Badge className="bg-yellow-600 text-xs animate-pulse">NUEVO</Badge>}</div><p className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()} ({mA < 60 ? `${mA}m` : `${Math.floor(mA / 60)}h`})</p></div></div>
                    <div className="flex gap-2"><Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={async () => { await fetch('/api/pending-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', userId: u.id }) }); toast.success(`${u.username} verificado`); loadAdminData() }}>Verificar</Button><Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs" onClick={async () => { await fetch('/api/pending-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', userId: u.id }) }); toast.error(`${u.username} eliminado`); loadAdminData() }}>Rechazar</Button></div>
                  </div>
                )})}
                {pendingUsers.length === 0 && <p className="text-gray-500 text-center py-4">No hay pendientes</p>}
              </div></ScrollArea></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video-queue">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Cola de Verificacion por Video ({videoQueue.length})</CardTitle><CardDescription className="text-gray-400">Usuarios esperando verificacion por video P2P via PeerJS</CardDescription></CardHeader>
              <CardContent>
                {!peerReady ? (
                  <div className="text-center py-8 space-y-3"><div className="text-4xl">📡</div><p className="text-gray-400 text-sm">Conectando al P2P...</p></div>
                ) : videoQueue.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nadie esperando verificacion por video</p>
                ) : (
                  <ScrollArea className="max-h-96"><div className="space-y-2">
                    {videoQueue.map((item: any, i: number) => { const wM = Math.floor((Date.now() - item.timestamp) / 60000); const wS = Math.floor(((Date.now() - item.timestamp) % 60000) / 1000); return (
                      <div key={item.peerId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3"><span className="text-gray-500 text-sm w-6">#{i + 1}</span><span>{getGenderShort(item.gender)}</span><div><p className="font-medium text-sm">{item.username}</p><p className="text-xs text-gray-500">{wM}m {wS}s</p></div></div>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleJoinVerification(item)}>Unirme (P2P)</Button>
                      </div>
                    )})}
                  </div></ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reported">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Reportados ({reportedUsers.length})</CardTitle></CardHeader>
              <CardContent><ScrollArea className="max-h-96"><div className="space-y-2">
                {reportedUsers.sort((a: any, b: any) => b._count?.reports - a._count?.reports).map((u: any) => (
                  <div key={u.id} className={`p-3 rounded-lg border ${u.banned ? 'bg-red-900/20 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-3"><span>{getGenderShort(u.gender)}</span><span className="font-medium text-sm">{u.username}</span><Badge className={u._count?.reports >= 3 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}>{u._count?.reports} reporte{u._count?.reports !== 1 ? 's' : ''}</Badge>{u.banned && <Badge className="bg-red-800">BANEADO</Badge>}{u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && <Badge className="bg-orange-600">SUSPENDIDO</Badge>}</div><div className="flex gap-2 flex-wrap">{!u.banned && <><Button size="sm" className="bg-red-600 text-xs" onClick={() => setBanDialog({ userId: u.id, username: u.username })}>Banear</Button><Button size="sm" className="bg-orange-600 text-xs" onClick={() => setSuspendDialog({ userId: u.id, username: u.username })}>Suspender</Button></>}{(u.banned || (u.suspendedUntil && new Date(u.suspendedUntil) > new Date())) && <Button size="sm" className="bg-green-600 text-xs" onClick={() => { if (u.banned) handleUnban(u.id); else handleUnsuspend(u.id) }}>{u.banned ? 'Desbanear' : 'Quitar susp.'}</Button>}<Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedReportedUser(selectedReportedUser?.id === u.id ? null : u)}>Ver</Button></div></div>
                    {selectedReportedUser?.id === u.id && u.reports?.length > 0 && <div className="mt-2 p-2 bg-gray-900 rounded-lg space-y-1">{u.reports.map((r: any) => (<div key={r.id} className="text-xs text-gray-300 flex gap-2"><span className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</span><span>-</span><span>Por: {r.reporter?.username || 'N/A'}</span><span>-</span><span className="text-yellow-400">{r.reason}</span></div>))}</div>}
                  </div>
                ))}
                {reportedUsers.length === 0 && <p className="text-gray-500 text-center py-8">No hay reportados</p>}
              </div></ScrollArea></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Banear a {banDialog?.username}</DialogTitle></DialogHeader><Input placeholder="Razon" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-gray-800 border-gray-600" /><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setBanDialog(null)}>Cancelar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleBan}>Banear</Button></div></DialogContent></Dialog>
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Suspender a {suspendDialog?.username}</DialogTitle></DialogHeader><Input type="number" placeholder="Horas" value={suspendHours} onChange={(e) => setSuspendHours(e.target.value)} className="bg-gray-800 border-gray-600" min="1" /><div className="flex gap-2 flex-wrap">{[1, 6, 24, 72, 168].map((h) => (<Button key={h} size="sm" variant="outline" className={Number(suspendHours) === h ? 'bg-orange-600 border-orange-500' : ''} onClick={() => setSuspendHours(String(h))}>{h}h</Button>))}</div><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setSuspendDialog(null)}>Cancelar</Button><Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSuspend}>Suspender</Button></div></DialogContent></Dialog>
    </div>
  )
}

// ==================== SUPER ADMIN VIEW ====================
function SuperAdminView() {
  const user = useDhobbytvStore((s) => s.user)
  const setVerificationTarget = useDhobbytvStore((s) => s.setVerificationTarget)
  const clearVerificationMessages = useDhobbytvStore((s) => s.clearVerificationMessages)

  const [pendingUsers, setPendingUsers] = useState<any[]>([])
  const [reportedUsers, setReportedUsers] = useState<any[]>([])
  const [videoQueue, setVideoQueue] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [onlineCount, setOnlineCount] = useState(0)
  const [peerReady, setPeerReady] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const [ads, setAds] = useState<any[]>([])
  const [adForm, setAdForm] = useState({ title: '', imageUrl: '', linkUrl: '', position: 'top' as string, active: true, showOnLogin: false, showOnMain: true, displayStyle: 'banner' as string, bgColor: '#6d28d9', textColor: '#ffffff', fontSize: 'sm' as string, borderRadius: 'lg' as string, htmlContent: '' })
  const [editingAdId, setEditingAdId] = useState<string | null>(null)

  const loadAdminData = async () => {
    try {
      const [pendingRes, reportedRes, statsRes, queueRes] = await Promise.all([
        fetch('/api/pending-users').then((r) => r.json()),
        fetch('/api/reported-users').then((r) => r.json()).catch(() => ({ users: [] })),
        fetch('/api/stats').then((r) => r.json()).catch(() => ({})),
        fetch('/api/verify-queue').then((r) => r.json()),
      ])
      if (pendingRes.users) setPendingUsers(pendingRes.users)
      if (reportedRes.users) setReportedUsers(reportedRes.users)
      if (statsRes) setStats(statsRes)
      if (queueRes.queue) setVideoQueue(queueRes.queue)
    } catch {}
  }

  const loadAds = async () => {
    try {
      const res = await fetch('/api/ads?action=list')
      const data = await res.json()
      if (data.ads) setAds(data.ads)
    } catch {}
  }

  // PeerJS setup para super admin (cola via API)
  // NOTA: No destruimos el peer al desmontar porque puede volver de admin-verification
  useEffect(() => {
    let mounted = true
    let unsubOnline: (() => void) | null = null

    // Si ya hay un peer activo, reutilizarlo
    if (globalPeer && globalPeerId && !globalPeer.destroyed) {
      setPeerReady(true)
      if (globalGun) {
        unsubOnline = watchOnlineCount(globalGun, (count) => { if (mounted) setOnlineCount(count) })
      }
    } else {
      const setup = async () => {
        const gun = await getGun()
        if (!mounted) return
        setGlobalGun(gun)

        const peerId = genPeerId(user!.username + '_super')
        setGlobalPeerId(peerId)
        const peer = createPeer(peerId)
        setGlobalPeer(peer)

        peer.on('open', () => {
          if (!mounted) return
          setPeerReady(true)
          goOnline(gun, peerId, { username: user!.username, gender: user!.gender, country: '', countryCode: '', verified: true, isAdmin: true })
        })

        peer.on('error', () => { if (mounted) setPeerReady(false) })

        unsubOnline = watchOnlineCount(gun, (count) => { if (mounted) setOnlineCount(count) })
      }
      setup()
    }

    loadAdminData()
    loadAds()
    const refreshInterval = setInterval(() => { loadAdminData(); loadAds() }, 5000)

    return () => {
      mounted = false
      clearInterval(refreshInterval)
      // NO destruimos peer/gun aqui - se reutilizan si volvemos rapido
    }
  }, [])

  const handleJoinVerification = async (target: any) => {
    if (!globalPeer) { toast.error('P2P no listo'); return }
    await fetch('/api/verify-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'signal', targetPeerId: target.peerId, adminPeerId: globalPeer!.id }),
    })
    await new Promise((r) => setTimeout(r, 1500))
    setVerificationTarget({ peerId: target.peerId, username: target.username, gender: target.gender })
    clearVerificationMessages()
    useDhobbytvStore.getState().setView('admin-verification')
  }

  const handleSaveAnnouncement = async () => {
    await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: announcement }) })
    toast.success('Anuncio guardado')
  }

  const handleSaveAd = async () => {
    const action = editingAdId ? 'update' : 'create'
    await fetch('/api/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id: editingAdId, ...adForm }) })
    toast.success(editingAdId ? 'Anuncio actualizado' : 'Anuncio creado')
    setEditingAdId(null)
    setAdForm({ title: '', imageUrl: '', linkUrl: '', position: 'top', active: true, showOnLogin: false, showOnMain: true, displayStyle: 'banner', bgColor: '#6d28d9', textColor: '#ffffff', fontSize: 'sm', borderRadius: 'lg', htmlContent: '' })
    loadAds()
  }

  const [banDialog, setBanDialog] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; username: string } | null>(null)
  const [suspendHours, setSuspendHours] = useState('24')
  const [selectedReportedUser, setSelectedReportedUser] = useState<any>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([loadAdminData(), loadAds()])
    setTimeout(() => setRefreshing(false), 500)
  }

  const handleBan = async () => { if (!banDialog) return; await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'ban', userId: banDialog.userId, reason: banReason }) }); toast.success(`${banDialog.username} baneado`); setBanDialog(null); setBanReason(''); loadAdminData() }
  const handleUnban = async (userId: string) => { await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unban', userId }) }); toast.success('Desbaneado'); loadAdminData() }
  const handleSuspend = async () => { if (!suspendDialog) return; await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'suspend', userId: suspendDialog.userId, hours: Number(suspendHours) }) }); toast.success(`${suspendDialog.username} suspendido`); setSuspendDialog(null); loadAdminData() }
  const handleUnsuspend = async (userId: string) => { await fetch('/api/admin-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsuspend', userId }) }); toast.success('Suspension quitada'); loadAdminData() }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-red-400 text-sm ml-2">SUPER ADMIN</span></h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleRefresh} disabled={refreshing}>
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </Button>
            <Badge variant="outline" className={peerReady ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}>{peerReady ? 'P2P Activo' : 'P2P Inactivo'}</Badge>
            <Badge variant="outline" className="text-green-400 border-green-400 text-xs">{onlineCount} online</Badge>
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={() => { cleanupPeer(globalPeer); setGlobalPeer(null); if (globalPeerId && globalGun) goOffline(globalGun, globalPeerId); useDhobbytvStore.getState().reset(); useDhobbytvStore.getState().setView('login') }}>Salir</Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {stats && (<div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">{[{ label: 'Total', value: stats.totalUsers, color: 'text-purple-400' },{ label: 'Verificados', value: stats.verifiedUsers, color: 'text-green-400' },{ label: 'Pendientes', value: stats.pendingUsers, color: 'text-yellow-400' },{ label: 'Baneados', value: stats.bannedUsers, color: 'text-red-400' },{ label: 'Reportes', value: stats.totalReports, color: 'text-orange-400' }].map((s) => (<Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-3 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></CardContent></Card>))}</div>)}

        <Tabs defaultValue="video-queue">
          <TabsList className="bg-gray-900 mb-4">
            <TabsTrigger value="video-queue" className="data-[state=active]:bg-purple-600">Video Queue ({videoQueue.length})</TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-purple-600">Pendientes ({pendingUsers.length})</TabsTrigger>
            <TabsTrigger value="reported" className="data-[state=active]:bg-purple-600">Reportados ({reportedUsers.length})</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-purple-600">Anuncios</TabsTrigger>
            <TabsTrigger value="ads-mgmt" className="data-[state=active]:bg-purple-600">Publicidad</TabsTrigger>
          </TabsList>

          <TabsContent value="video-queue">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Cola de Verificacion por Video ({videoQueue.length})</CardTitle><CardDescription className="text-gray-400">Usuarios esperando verificacion por video P2P via PeerJS</CardDescription></CardHeader>
              <CardContent>
                {!peerReady ? (<div className="text-center py-8 space-y-3"><div className="text-4xl">📡</div><p className="text-gray-400 text-sm">Conectando...</p></div>) : videoQueue.length === 0 ? (<p className="text-gray-500 text-center py-8">Nadie esperando verificacion por video</p>) : (
                  <ScrollArea className="max-h-64"><div className="space-y-2">
                    {videoQueue.map((item: any, i: number) => { const wM = Math.floor((Date.now() - item.timestamp) / 60000); const wS = Math.floor(((Date.now() - item.timestamp) % 60000) / 1000); return (
                      <div key={item.peerId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3"><span className="text-gray-500 text-sm w-6">#{i + 1}</span><span>{getGenderShort(item.gender)}</span><div><p className="font-medium text-sm">{item.username}</p><p className="text-xs text-gray-500">{wM}m {wS}s</p></div></div>
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleJoinVerification(item)}>Unirme (P2P)</Button>
                      </div>
                    )})}
                  </div></ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Pendientes - Verificacion Directa ({pendingUsers.length})</CardTitle><CardDescription className="text-gray-400">Se actualiza cada 10s. Verifica sin video.</CardDescription></CardHeader>
              <CardContent><ScrollArea className="max-h-64"><div className="space-y-2">
                {pendingUsers.map((u: any) => { const mA = Math.floor((Date.now() - new Date(u.createdAt).getTime()) / 60000); const isNew = mA < 10; return (
                  <div key={u.id} className={`flex items-center justify-between p-3 rounded-lg border ${isNew ? 'bg-yellow-900/20 border-yellow-800' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center gap-3"><span>{getGenderShort(u.gender)}</span><div><div className="flex items-center gap-2"><p className="font-medium text-sm">{u.username}</p>{isNew && <Badge className="bg-yellow-600 text-xs animate-pulse">NUEVO</Badge>}</div><p className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleString()} ({mA < 60 ? `${mA}m` : `${Math.floor(mA / 60)}h`})</p></div></div>
                    <div className="flex gap-2"><Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={async () => { await fetch('/api/pending-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', userId: u.id }) }); toast.success(`${u.username} verificado`); loadAdminData() }}>Verificar</Button><Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs" onClick={async () => { await fetch('/api/pending-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject', userId: u.id }) }); toast.error(`${u.username} eliminado`); loadAdminData() }}>Rechazar</Button></div>
                  </div>
                )})}
                {pendingUsers.length === 0 && <p className="text-gray-500 text-center py-4">No hay pendientes</p>}
              </div></ScrollArea></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reported">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Reportados ({reportedUsers.length})</CardTitle></CardHeader>
              <CardContent><ScrollArea className="max-h-96"><div className="space-y-2">
                {reportedUsers.sort((a: any, b: any) => (b._count?.reports || 0) - (a._count?.reports || 0)).map((u: any) => (
                  <div key={u.id} className={`p-3 rounded-lg border ${u.banned ? 'bg-red-900/20 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2"><div className="flex items-center gap-3"><span>{getGenderShort(u.gender)}</span><span className="font-medium text-sm">{u.username}</span><Badge className={(u._count?.reports || 0) >= 3 ? 'bg-red-600 text-white' : 'bg-orange-600 text-white'}>{u._count?.reports || 0} reporte{(u._count?.reports || 0) !== 1 ? 's' : ''}</Badge>{u.banned && <Badge className="bg-red-800">BANEADO</Badge>}{u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && <Badge className="bg-orange-600">SUSPENDIDO</Badge>}</div><div className="flex gap-2 flex-wrap">{!u.banned && <><Button size="sm" className="bg-red-600 text-xs" onClick={() => setBanDialog({ userId: u.id, username: u.username })}>Banear</Button><Button size="sm" className="bg-orange-600 text-xs" onClick={() => setSuspendDialog({ userId: u.id, username: u.username })}>Suspender</Button></>}{(u.banned || (u.suspendedUntil && new Date(u.suspendedUntil) > new Date())) && <Button size="sm" className="bg-green-600 text-xs" onClick={() => { if (u.banned) handleUnban(u.id); else handleUnsuspend(u.id) }}>{u.banned ? 'Desbanear' : 'Quitar susp.'}</Button>}<Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedReportedUser(selectedReportedUser?.id === u.id ? null : u)}>Ver</Button></div></div>
                    {selectedReportedUser?.id === u.id && u.reports?.length > 0 && <div className="mt-2 p-2 bg-gray-900 rounded-lg space-y-1">{u.reports.map((r: any) => (<div key={r.id} className="text-xs text-gray-300 flex gap-2"><span className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</span><span>-</span><span>Por: {r.reporter?.username || 'N/A'}</span><span>-</span><span className="text-yellow-400">{r.reason}</span></div>))}</div>}
                  </div>
                ))}
                {reportedUsers.length === 0 && <p className="text-gray-500 text-center py-8">No hay reportados</p>}
              </div></ScrollArea></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Anuncio Global</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Escribe el anuncio..." value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="bg-gray-800 border-gray-600" />
                <Button onClick={handleSaveAnnouncement} className="bg-purple-600 hover:bg-purple-700">Guardar Anuncio</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ads-mgmt">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Gestion de Anuncios ({ads.length})</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-medium">{editingAdId ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h3>
                    <Input placeholder="Titulo" value={adForm.title} onChange={(e) => setAdForm({ ...adForm, title: e.target.value })} className="bg-gray-800 border-gray-600" />
                    <Input placeholder="URL de imagen" value={adForm.imageUrl} onChange={(e) => setAdForm({ ...adForm, imageUrl: e.target.value })} className="bg-gray-800 border-gray-600" />
                    <Input placeholder="URL de enlace" value={adForm.linkUrl} onChange={(e) => setAdForm({ ...adForm, linkUrl: e.target.value })} className="bg-gray-800 border-gray-600" />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={adForm.position} onChange={(e) => setAdForm({ ...adForm, position: e.target.value })} className="bg-gray-800 border-gray-600 text-white rounded-lg p-2 text-sm"><option value="top">Arriba</option><option value="bottom">Abajo</option><option value="side">Lado</option></select>
                      <select value={adForm.displayStyle} onChange={(e) => setAdForm({ ...adForm, displayStyle: e.target.value })} className="bg-gray-800 border-gray-600 text-white rounded-lg p-2 text-sm"><option value="banner">Banner</option><option value="minimal">Minimal</option><option value="neon">Neon</option><option value="wide">Wide</option></select>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={adForm.bgColor} onChange={(e) => setAdForm({ ...adForm, bgColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                      <input type="color" value={adForm.textColor} onChange={(e) => setAdForm({ ...adForm, textColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                      <select value={adForm.fontSize} onChange={(e) => setAdForm({ ...adForm, fontSize: e.target.value })} className="bg-gray-800 border-gray-600 text-white rounded p-1 text-xs"><option value="xs">XS</option><option value="sm">SM</option><option value="md">MD</option><option value="lg">LG</option></select>
                    </div>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={adForm.showOnLogin} onChange={(e) => setAdForm({ ...adForm, showOnLogin: e.target.checked })} /> Login</label>
                      <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={adForm.showOnMain} onChange={(e) => setAdForm({ ...adForm, showOnMain: e.target.checked })} /> Main</label>
                      <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={adForm.active} onChange={(e) => setAdForm({ ...adForm, active: e.target.checked })} /> Activo</label>
                    </div>
                    <Button onClick={handleSaveAd} className="bg-green-600 hover:bg-green-700 w-full">{editingAdId ? 'Actualizar' : 'Crear'} Anuncio</Button>
                    {editingAdId && <Button variant="outline" onClick={() => { setEditingAdId(null); setAdForm({ title: '', imageUrl: '', linkUrl: '', position: 'top', active: true, showOnLogin: false, showOnMain: true, displayStyle: 'banner', bgColor: '#6d28d9', textColor: '#ffffff', fontSize: 'sm', borderRadius: 'lg', htmlContent: '' }) }}>Cancelar</Button>}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Anuncios Existentes</h3>
                    <ScrollArea className="max-h-96"><div className="space-y-2">
                      {ads.map((ad: any) => (
                        <div key={ad.id} className={`p-3 bg-gray-800 rounded-lg border ${ad.active ? 'border-gray-600' : 'border-red-800 opacity-50'}`}>
                          <div className="flex items-center justify-between"><div><p className="font-medium text-sm">{ad.title || 'Sin titulo'}</p><p className="text-xs text-gray-500">{ad.position} | {ad.displayStyle} | {ad.active ? 'Activo' : 'Inactivo'}</p></div><div className="flex gap-1"><Button size="sm" variant="outline" className="text-xs" onClick={() => { setEditingAdId(ad.id); setAdForm({ title: ad.title, imageUrl: ad.imageUrl, linkUrl: ad.linkUrl, position: ad.position, active: ad.active, showOnLogin: ad.showOnLogin, showOnMain: ad.showOnMain, displayStyle: ad.displayStyle, bgColor: ad.bgColor, textColor: ad.textColor, fontSize: ad.fontSize, borderRadius: ad.borderRadius, htmlContent: ad.htmlContent }) }}>Edit</Button><Button size="sm" variant="outline" className="text-xs" onClick={async () => { await fetch('/api/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle', id: ad.id }) }); loadAds() }}>{ad.active ? 'Off' : 'On'}</Button><Button size="sm" variant="outline" className="text-xs text-red-400" onClick={async () => { await fetch('/api/ads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: ad.id }) }); loadAds() }}>X</Button></div></div>
                        </div>
                      ))}
                      {ads.length === 0 && <p className="text-gray-500 text-center py-4 text-sm">No hay anuncios</p>}
                    </div></ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Banear a {banDialog?.username}</DialogTitle></DialogHeader><Input placeholder="Razon" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-gray-800 border-gray-600" /><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setBanDialog(null)}>Cancelar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleBan}>Banear</Button></div></DialogContent></Dialog>
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Suspender a {suspendDialog?.username}</DialogTitle></DialogHeader><Input type="number" placeholder="Horas" value={suspendHours} onChange={(e) => setSuspendHours(e.target.value)} className="bg-gray-800 border-gray-600" min="1" /><div className="flex gap-2 flex-wrap">{[1, 6, 24, 72, 168].map((h) => (<Button key={h} size="sm" variant="outline" className={Number(suspendHours) === h ? 'bg-orange-600 border-orange-500' : ''} onClick={() => setSuspendHours(String(h))}>{h}h</Button>))}</div><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setSuspendDialog(null)}>Cancelar</Button><Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSuspend}>Suspender</Button></div></DialogContent></Dialog>
    </div>
  )
}

// ==================== MAIN VIEW (Gun.js matchmaking + PeerJS video/chat) ====================
function MainView() {
  const user = useDhobbytvStore((s) => s.user)
  const partner = useDhobbytvStore((s) => s.partner)
  const country = useDhobbytvStore((s) => s.country)
  const countryCode = useDhobbytvStore((s) => s.countryCode)
  const selectedCountry = useDhobbytvStore((s) => s.selectedCountry)
  const hobbies = useDhobbytvStore((s) => s.hobbies)
  const isSearching = useDhobbytvStore((s) => s.isSearching)
  const onlineCount = useDhobbytvStore((s) => s.onlineCount)
  const messages = useDhobbytvStore((s) => s.messages)
  const announcement = useDhobbytvStore((s) => s.announcement)
  const setSelectedCountry = useDhobbytvStore((s) => s.setSelectedCountry)
  const toggleHobby = useDhobbytvStore((s) => s.toggleHobby)
  const setPartner = useDhobbytvStore((s) => s.setPartner)
  const setSearching = useDhobbytvStore((s) => s.setSearching)
  const setOnlineCount = useDhobbytvStore((s) => s.setOnlineCount)
  const addMessage = useDhobbytvStore((s) => s.addMessage)
  const clearMessages = useDhobbytvStore((s) => s.clearMessages)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const dataConnRef = useRef<any>(null)
  const mediaCallRef = useRef<any>(null)
  const [chatInput, setChatInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showCountrySelect, setShowCountrySelect] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const matchedRef = useRef(false)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Setup Gun.js + PeerJS
  useEffect(() => {
    let mounted = true
    let unsubOnline: (() => void) | null = null
    let unsubMatch: (() => void) | null = null

    const setup = async () => {
      const gun = await getGun()
      if (!mounted) return
      setGlobalGun(gun)

      const peerId = genPeerId(user!.username)
      setGlobalPeerId(peerId)
      const peer = createPeer(peerId)
      setGlobalPeer(peer)

      peer.on('open', () => {
        if (!mounted) return
        // Registrarse online
        goOnline(gun, peerId, {
          username: user!.username, gender: user!.gender,
          country, countryCode, verified: true, isAdmin: false,
        })
      })

      // Escuchar conteo online
      unsubOnline = watchOnlineCount(gun, (count) => { if (mounted) setOnlineCount(count) })

      // Escuchar llamadas entrantes (cuando otro user nos encuentra)
      peer.on('call', (call) => {
        if (!mounted || !globalStream) return
        call.answer(globalStream)
        mediaCallRef.current = call

        call.on('stream', (remoteStream: MediaStream) => {
          if (remoteVideoRef.current && mounted) remoteVideoRef.current.srcObject = remoteStream
        })

        call.on('close', () => { if (mounted) handleNext() })
      })

      // Escuchar conexiones de datos entrantes (chat del otro user)
      peer.on('connection', (conn) => {
        if (!mounted) return
        dataConnRef.current = conn

        conn.on('open', () => { setSearching(false) })

        conn.on('data', (raw: any) => {
          if (!mounted) return
          try {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (msg.type === 'chat') addMessage(partner?.username || 'Otro', msg.text)
            else if (msg.type === 'partner-info') {
              setPartner({ peerSocketId: msg.peerId, username: msg.username, gender: msg.gender, country: msg.country, countryCode: msg.countryCode })
              addMessage('Sistema', `Conectado con ${msg.username} ${getCountryFlag(msg.countryCode)} ${msg.country}`)
              clearMessages()
              addMessage('Sistema', `Conectado con ${msg.username} ${getCountryFlag(msg.countryCode)} ${msg.country}`)
            }
          } catch { addMessage(partner?.username || 'Otro', String(raw)) }
        })

        conn.on('close', () => { if (mounted) handleNext() })
      })
    }

    setup()

    return () => {
      mounted = false
      if (unsubOnline) unsubOnline()
      if (unsubMatch) unsubMatch()
      stopStream(globalStream)
      setGlobalStream(null)
      if (globalPeerId && globalGun) {
        leaveSearching(globalGun, globalPeerId)
        goOffline(globalGun, globalPeerId)
      }
      cleanupPeer(globalPeer)
      setGlobalPeer(null)
      setGlobalPeerId(null)
    }
  }, [])

  const handleSearch = async () => {
    if (!globalPeer || !globalGun || !user) return
    clearMessages()
    setPartner(null)
    setSearching(true)
    matchedRef.current = false

    // Obtener camara
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      setGlobalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
    } catch {
      toast.error('No se pudo acceder a la camara')
      setSearching(false)
      return
    }

    // Escribir preferencias en Gun.js
    joinSearching(globalGun, globalPeerId!, {
      username: user.username, gender: user.gender,
      country, countryCode, hobbies, countryFilter: selectedCountry,
    })

    // Buscar match
    const unsub = watchForMatch(
      globalGun, globalPeerId!,
      { countryFilter: selectedCountry, hobbies, gender: user.gender },
      async (match) => {
        if (matchedRef.current || !globalPeer || !globalGun) return
        matchedRef.current = true
        unsub() // dejar de escuchar

        // Remover ambos de searching
        leaveSearching(globalGun, globalPeerId!)
        leaveSearching(globalGun, match.peerId)
        setSearching(false)

        // Establecer partner info
        setPartner({
          peerSocketId: match.peerId,
          username: match.username,
          gender: match.gender,
          country: match.country,
          countryCode: match.countryCode,
        })
        clearMessages()
        addMessage('Sistema', `Conectado con ${match.username} ${getCountryFlag(match.countryCode)} ${match.country}`)

        // Llamar al match via PeerJS (video)
        const call = globalPeer.call(match.peerId, globalStream!)
        mediaCallRef.current = call

        call.on('stream', (remoteStream: MediaStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream
        })

        call.on('close', () => { if (matchedRef.current) handleNext() })

        // Conectar data channel (chat)
        const conn = globalPeer.connect(match.peerId, { reliable: true })
        dataConnRef.current = conn

        conn.on('open', () => {
          // Enviar info del partner
          conn.send(JSON.stringify({
            type: 'partner-info',
            peerId: globalPeerId,
            username: user.username, gender: user.gender,
            country, countryCode,
          }))
        })

        conn.on('data', (raw: any) => {
          try {
            const msg = typeof raw === 'string' ? JSON.parse(raw) : raw
            if (msg.type === 'chat') addMessage(match.username, msg.text)
            else if (msg.type === 'partner-info') {
              setPartner({ peerSocketId: msg.peerId, username: msg.username, gender: msg.gender, country: msg.country, countryCode: msg.countryCode })
              clearMessages()
              addMessage('Sistema', `Conectado con ${msg.username} ${getCountryFlag(msg.countryCode)} ${msg.country}`)
            }
          } catch { addMessage(match.username, String(raw)) }
        })

        conn.on('close', () => { if (matchedRef.current) handleNext() })
      }
    )
  }

  const handleNext = useCallback(() => {
    matchedRef.current = false
    setPartner(null)
    clearMessages()
    setSearching(false)
    try { dataConnRef.current?.close() } catch {}
    try { mediaCallRef.current?.close() } catch {}
    dataConnRef.current = null
    mediaCallRef.current = null
    stopStream(globalStream)
    setGlobalStream(null)
    if (globalPeerId && globalGun) leaveSearching(globalGun, globalPeerId)
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }, [setPartner, clearMessages, setSearching])

  const handleSendMessage = () => {
    if (!chatInput.trim() || !dataConnRef.current) return
    dataConnRef.current.send(JSON.stringify({ type: 'chat', text: chatInput }))
    addMessage(user?.username || 'Tu', chatInput)
    setChatInput('')
  }

  const handleReport = async () => {
    if (!partner || !reportReason || !user) return
    await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportedUsername: partner.username, reporterUsername: user.username, reason: reportReason }) })
    toast.success('Reporte enviado')
    setShowReport(false)
    setReportReason('')
    handleNext()
  }

  const handleLogout = () => {
    handleNext()
    if (globalPeerId && globalGun) goOffline(globalGun, globalPeerId)
    cleanupPeer(globalPeer)
    setGlobalPeer(null)
    setGlobalPeerId(null)
    useDhobbytvStore.getState().reset()
    useDhobbytvStore.getState().setView('login')
  }

  const filteredCountries = COUNTRIES.filter((c) => c.code === 'all' || c.name.toLowerCase().includes(countrySearch.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {announcement && <div className="bg-yellow-600 text-white text-center py-2 text-sm shrink-0">{announcement}</div>}
      <header className="border-b border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span></h1>
          <div className="flex items-center gap-3"><Badge variant="outline" className="text-green-400 border-green-400 text-xs">{onlineCount} online</Badge><span className="text-gray-400 text-sm hidden sm:inline">{getCountryFlag(countryCode)} {user?.username}</span><Button variant="ghost" size="sm" className="text-gray-400" onClick={handleLogout}>Salir</Button></div>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        {!partner && !isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center"><h2 className="text-3xl font-bold mb-2">{getGenderShort(user?.gender || '')} Hola, {user?.username}</h2><p className="text-gray-400">Selecciona tus preferencias y busca alguien</p></div>
            <Card className="w-full max-w-md bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-sm text-gray-400 mb-3">Filtrar por pais:</p><div className="relative"><button onClick={() => setShowCountrySelect(!showCountrySelect)} className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors"><span className="flex items-center gap-2">{getCountryFlag(selectedCountry)} {getCountryName(selectedCountry)}</span><svg className={`w-4 h-4 transition-transform ${showCountrySelect ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>{showCountrySelect && (<div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-hidden"><div className="p-2"><Input placeholder="Buscar pais..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="bg-gray-700 border-gray-600 text-sm" autoFocus /></div><ScrollArea className="max-h-48">{filteredCountries.map((c) => (<button key={c.code} onClick={() => { setSelectedCountry(c.code); setShowCountrySelect(false); setCountrySearch('') }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${selectedCountry === c.code ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300'}`}>{c.flag} {c.name}</button>))}</ScrollArea></div>)}</div></CardContent></Card>
            <Card className="w-full max-w-md bg-gray-900 border-gray-800"><CardContent className="p-4"><p className="text-sm text-gray-400 mb-3">Tus intereses (opcional):</p><div className="flex flex-wrap gap-2">{HOBBIES.map((h) => (<button key={h.id} onClick={() => toggleHobby(h.id)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${hobbies.includes(h.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{h.icon} {h.label}</button>))}</div></CardContent></Card>
            <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700 text-white font-bold px-12 py-7 text-xl rounded-2xl">Buscar Persona</Button>
          </div>
        )}
        {isSearching && !partner && (<div className="flex-1 flex flex-col items-center justify-center gap-4"><div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="text-gray-400 text-lg">Buscando persona...</p><Button variant="outline" className="text-gray-400" onClick={handleNext}>Cancelar</Button></div>)}
        {partner && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2"><div className="flex items-center gap-2"><span>{getGenderShort(partner.gender)}</span><span className="font-medium">{partner.username}</span><span className="text-gray-400">{getCountryFlag(partner.countryCode)} {partner.country}</span></div></div>
            <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-0"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" /><div className="absolute bottom-3 right-3 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-purple-500 shadow-lg"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></div>
            <div className="bg-gray-900 rounded-lg h-32 overflow-y-auto p-3 space-y-1">{messages.map((msg, i) => (<p key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-purple-400 italic' : msg.from === user?.username ? 'text-green-400' : 'text-gray-300'}`}><span className="font-medium">{msg.from}:</span> {msg.text}</p>))}<div ref={messagesEndRef} /></div>
            <div className="flex gap-2"><Input placeholder="Escribe un mensaje..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="bg-gray-800 border-gray-700 text-white flex-1" /><Button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700">Enviar</Button></div>
            <div className="flex gap-2"><Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">Siguiente</Button><Button variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white" onClick={() => setShowReport(true)}>Reportar</Button></div>
          </div>
        )}
      </main>
      <Dialog open={showReport} onOpenChange={setShowReport}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Reportar a {partner?.username}</DialogTitle></DialogHeader><Input placeholder="Razon" value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="bg-gray-800 border-gray-600" /><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowReport(false)}>Cancelar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReport}>Reportar</Button></div></DialogContent></Dialog>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function DhobbytvApp() {
  const view = useDhobbytvStore((s) => s.view)
  const setCountry = useDhobbytvStore((s) => s.setCountry)
  const setAnnouncement = useDhobbytvStore((s) => s.setAnnouncement)
  const [hydrated, setHydrated] = useState(false)

  // Esperar a que Zustand hydrate desde localStorage
  useEffect(() => {
    setHydrated(true)
    fetch('/api/geoip').then((r) => r.json()).then((data) => setCountry(data.country, data.countryCode)).catch(() => setCountry('Desconocido', 'XX'))
    fetch('/api/announcements').then((r) => r.json()).then((data) => { if (data.announcement) setAnnouncement(data.announcement.text) }).catch(() => {})
  }, [])
  useEffect(() => { fetch('/api/setup-admin').catch(() => {}) }, [])

  const views: Record<AppView, JSX.Element> = {
    login: <LoginView />,
    register: <RegisterView />,
    'verification-pending': <VerificationPendingView />,
    verification: <VerificationView />,
    'verification-video': <VerificationVideoView />,
    admin: <AdminView />,
    'admin-verification': <AdminVerificationView />,
    'super-admin': <SuperAdminView />,
    main: <MainView />,
    chat: <MainView />,
  }

  if (!hydrated) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>

  return (<>{views[view] || <LoginView />}<Toaster position="top-center" richColors /></>)
}