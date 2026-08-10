'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
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
        if (data.suspendedUntil) {
          toast.info(`Hasta: ${new Date(data.suspendedUntil).toLocaleString()}`)
        }
        return
      }
      setUser(data.user)
      if (data.user.isSuperAdmin) {
        setView('super-admin')
      } else if (data.user.isAdmin) {
        setView('admin')
      } else if (!data.user.verified) {
        setView('verification')
      } else {
        setView('main')
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const announcement = useDhobbytvStore((s) => s.announcement)

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      {announcement && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-2 text-sm z-50">
          {announcement}
        </div>
      )}
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-4xl font-black tracking-tight">
            <span className="text-purple-400">dhobby</span>
            <span className="text-green-400">tv</span>
          </CardTitle>
          <p className="text-gray-400 text-sm mt-1">Conecta con personas que comparten tus intereses</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <Button onClick={handleLogin} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-6 text-lg">
            {loading ? 'Entrando...' : 'Iniciar Sesión'}
          </Button>
          <div className="text-center">
            <button onClick={() => setView('register')} className="text-purple-400 hover:text-purple-300 text-sm underline">
              No tienes cuenta? Regístrate aquí
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
      setView('verification')
      toast.success('Cuenta creada! Ahora necesitas verificarte')
    } catch {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-black">
            <span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span>
          </CardTitle>
          <p className="text-gray-400 text-sm">Crea tu cuenta</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Usuario (3-20 caracteres)" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" />
          <Input type="password" placeholder="Contraseña (mínimo 4 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-500" />
          <div>
            <p className="text-gray-300 text-sm mb-2">Género:</p>
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
              Ya tienes cuenta? Inicia sesión
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== VERIFICATION WAITING ====================
function VerificationView() {
  const user = useDhobbytvStore((s) => s.user)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('join-verification-queue', { username: user?.username, gender: user?.gender })
    })
    socket.on('in-verification-queue', (data: { position: number }) => {
      toast.info(`Posición en la cola: ${data.position}`)
    })
    socket.on('start-verification', () => {
      useDhobbytvStore.getState().setView('verification-video')
    })
    socket.on('verification-accepted', () => {
      if (user) {
        useDhobbytvStore.getState().setUser({ ...user, verified: true })
        fetch('/api/verify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username }) })
      }
      toast.success('Has sido verificado!')
      useDhobbytvStore.getState().setView('main')
      socket.disconnect()
    })
    socket.on('verification-rejected', () => {
      if (user) {
        fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username }) })
      }
      toast.error('Verificación rechazada. Tu cuenta ha sido eliminada.')
      useDhobbytvStore.getState().setUser(null)
      useDhobbytvStore.getState().setView('login')
      socket.disconnect()
    })
    return () => { socket.disconnect() }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <Card className="w-full max-w-md bg-gray-900/80 border-gray-700 text-white text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="text-6xl animate-pulse">🔒</div>
          <h2 className="text-2xl font-bold">Verificación de Edad</h2>
          <p className="text-gray-400">Prepara tu documento de identificación. El admin te pedirá que lo muestres por cámara.</p>
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Esperando en la cola de verificación...
          </div>
          <Button variant="outline" className="text-gray-400 border-gray-600" onClick={() => { socketRef.current?.disconnect(); useDhobbytvStore.getState().setUser(null); useDhobbytvStore.getState().setView('login') }}>Salir</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== VERIFICATION VIDEO ====================
function VerificationVideoView() {
  const user = useDhobbytvStore((s) => s.user)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [message, setMessage] = useState('Conectando con administrador...')

  useEffect(() => {
    let mounted = true
    const setup = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return }
      setLocalStream(stream)
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      const socket = io('/?XTransformPort=3003', { transports: ['websocket'] })
      socketRef.current = socket
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      peerRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.onicecandidate = (e) => { if (e.candidate) socket.emit('webrtc-ice-candidate', { targetId: useDhobbytvStore.getState().verificationAdminSocketId, candidate: e.candidate }) }
      socket.on('webrtc-offer', async (data: { fromId: string; offer: RTCSessionDescriptionInit }) => {
        setMessage('Conectado con administrador. Muestra tu identificación.')
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('webrtc-answer', { targetId: data.fromId, answer })
      })
      socket.on('verification-accepted', () => {
        if (user) {
          useDhobbytvStore.getState().setUser({ ...user, verified: true })
          fetch('/api/verify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username }) })
        }
        toast.success('Verificado!'); cleanup(); useDhobbytvStore.getState().setView('main')
      })
      socket.on('verification-rejected', () => {
        if (user) fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username }) })
        toast.error('Rechazado'); cleanup(); useDhobbytvStore.getState().setUser(null); useDhobbytvStore.getState().setView('login')
      })
      socket.on('verification-admin-disconnected', () => {
        toast.error('El admin se desconectó'); setMessage('Volviendo a la cola...')
        setTimeout(() => { cleanup(); useDhobbytvStore.getState().setView('verification') }, 2000)
      })
    }
    setup()
    const cleanup = () => { mounted = false; localStream?.getTracks().forEach((t) => t.stop()); peerRef.current?.close(); socketRef.current?.disconnect() }
    return cleanup
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-900 via-indigo-900 to-black">
      <Card className="w-full max-w-lg bg-gray-900/80 border-gray-700 text-white">
        <CardHeader className="text-center"><CardTitle className="text-xl">Verificación con Administrador</CardTitle><p className="text-yellow-400 text-sm">Muestra tu identificación por cámara</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><div className="w-2 h-2 bg-white rounded-full animate-pulse" />TU CÁMARA</div>
          </div>
          <p className="text-center text-gray-300 text-sm">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// ==================== SUPER ADMIN PANEL ====================
function SuperAdminView() {
  const user = useDhobbytvStore((s) => s.user)
  const [activeTab, setActiveTab] = useState('admins')
  const [stats, setStats] = useState<any>(null)
  const [admins, setAdmins] = useState<any[]>([])
  const [reportedUsers, setReportedUsers] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [newAnnouncement, setNewAnnouncement] = useState('')
  const [newAdminUsername, setNewAdminUsername] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminGender, setNewAdminGender] = useState('Hombre')
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; username: string } | null>(null)
  const [suspendHours, setSuspendHours] = useState('')
  const [banDialog, setBanDialog] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const [selectedReportedUser, setSelectedReportedUser] = useState<any>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [s, a, r, an] = await Promise.all([
          fetch('/api/super-admin-stats').then((r) => r.json()),
          fetch('/api/manage-admins').then((r) => r.json()),
          fetch('/api/reported-users').then((r) => r.json()),
          fetch('/api/announcements?all=true').then((r) => r.json()),
        ])
        if (!cancelled) { setStats(s); setAdmins(a.admins || []); setReportedUsers(r.users || []); setAnnouncements(an.announcements || []) }
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const loadSuperAdminData = useCallback(async () => {
    try {
      const [s, a, r, an] = await Promise.all([
        fetch('/api/super-admin-stats').then((r) => r.json()),
        fetch('/api/manage-admins').then((r) => r.json()),
        fetch('/api/reported-users').then((r) => r.json()),
        fetch('/api/announcements?all=true').then((r) => r.json()),
      ])
      setStats(s); setAdmins(a.admins || []); setReportedUsers(r.users || []); setAnnouncements(an.announcements || [])
    } catch { /* ignore */ }
  }, [])

  const handleCreateAdmin = async () => {
 if (!newAdminUsername || !newAdminPassword) return toast.error('Completa los campos')
    const res = await fetch('/api/manage-admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', username: newAdminUsername, password: newAdminPassword, gender: newAdminGender }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`Admin ${newAdminUsername} creado`)
    setNewAdminUsername(''); setNewAdminPassword(''); loadSuperAdminData()
  }

  const handleDeleteAdmin = async (username: string) => {
    const res = await fetch('/api/manage-admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', username }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`Admin ${username} eliminado`)
    loadSuperAdminData()
  }

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.trim()) return toast.error('Escribe un anuncio')
    await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: newAnnouncement }) })
    toast.success('Anuncio publicado')
    setNewAnnouncement(''); loadSuperAdminData()
  }

  const handleDeleteAnnouncement = async (id: string) => {
    await fetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id }) })
    toast.success('Anuncio eliminado'); loadSuperAdminData()
  }

  const handleBan = async () => {
    if (!banDialog || !banReason) return toast.error('Escribe la razón')
    const res = await fetch('/api/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: banDialog.userId, reason: banReason }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`${banDialog.username} baneado permanentemente`)
    setBanDialog(null); setBanReason(''); loadSuperAdminData()
  }

  const handleSuspend = async () => {
    if (!suspendDialog || !suspendHours) return toast.error('Indica las horas')
    const res = await fetch('/api/suspend-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: suspendDialog.userId, hours: suspendHours }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`${suspendDialog.username} suspendido por ${suspendHours} horas`)
    setSuspendDialog(null); setSuspendHours(''); loadSuperAdminData()
  }

  const handleUnban = async (userId: string) => {
    await fetch('/api/unban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type: 'unban' }) })
    toast.success('Usuario desbaneado'); loadSuperAdminData()
  }

  const handleUnsuspend = async (userId: string) => {
    await fetch('/api/unban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type: 'unsuspend' }) })
    toast.success('Suspensión removida'); loadSuperAdminData()
  }

  const handleLogout = () => { useDhobbytvStore.getState().reset(); useDhobbytvStore.getState().setView('login') }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-red-400 text-sm ml-2">SUPER ADMIN</span></h1>
          <Button variant="outline" className="text-gray-400" onClick={handleLogout}>Salir</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Usuarios Verificados', value: stats.verifiedUsers, color: 'text-green-400' },
              { label: 'Baneados', value: stats.bannedUsers, color: 'text-red-400' },
              { label: 'Suspendidos', value: stats.suspendedUsers, color: 'text-orange-400' },
              { label: 'Total Reportes', value: stats.totalReports, color: 'text-yellow-400' },
            ].map((s) => (
              <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-3 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></CardContent></Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-900 mb-6 flex-wrap">
            <TabsTrigger value="admins" className="data-[state=active]:bg-purple-600">Admins</TabsTrigger>
            <TabsTrigger value="reported" className="data-[state=active]:bg-purple-600">Usuarios Reportados</TabsTrigger>
            <TabsTrigger value="announcements" className="data-[state=active]:bg-purple-600">Anuncios</TabsTrigger>
          </TabsList>

          {/* ADMINS TAB */}
          <TabsContent value="admins">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-lg">Crear Nuevo Admin</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Usuario" value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} className="bg-gray-800 border-gray-600" />
                  <Input placeholder="Contraseña" type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} className="bg-gray-800 border-gray-600" />
                  <div className="grid grid-cols-3 gap-2">
                    {['Hombre', 'Mujer', 'Trans'].map((g) => (
                      <button key={g} onClick={() => setNewAdminGender(g)} className={`py-2 rounded-lg text-xs border ${newAdminGender === g ? 'bg-purple-600 border-purple-500' : 'bg-gray-800 border-gray-600'}`}>{getGenderLabel(g)}</button>
                    ))}
                  </div>
                  <Button onClick={handleCreateAdmin} className="w-full bg-purple-600 hover:bg-purple-700">Crear Admin</Button>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-lg">Admins Actuales ({admins.length})</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2">
                      {admins.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            {a.isSuperAdmin && <Badge className="bg-red-600">SUPER</Badge>}
                            <span>{getGenderShort(a.gender)} {a.username}</span>
                          </div>
                          {!a.isSuperAdmin && (
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAdmin(a.username)}>Eliminar</Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* REPORTED USERS TAB */}
          <TabsContent value="reported">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader><CardTitle className="text-lg">Usuarios con Reportes ({reportedUsers.length})</CardTitle><CardDescription className="text-gray-400">Ordenados por cantidad de reportes (mayor primero)</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2">
                    {reportedUsers.sort((a, b) => b._count.reports - a._count.reports).map((u) => (
                      <div key={u.id} className={`p-3 rounded-lg border ${u.banned ? 'bg-red-900/20 border-red-800' : u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? 'bg-orange-900/20 border-orange-800' : 'bg-gray-800 border-gray-700'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getGenderShort(u.gender)}</span>
                            <div>
                              <p className="font-medium">{u.username}</p>
                              <p className="text-xs text-gray-500">Registrado: {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={u._count.reports >= 5 ? 'destructive' : u._count.reports >= 3 ? 'secondary' : 'outline'} className={u._count.reports >= 3 ? 'bg-red-600 text-white' : u._count.reports >= 2 ? 'bg-orange-600 text-white' : ''}>
                              {u._count.reports} reporte{u._count.reports !== 1 ? 's' : ''}
                            </Badge>
                            {u.banned && <Badge className="bg-red-800">BANEADO</Badge>}
                            {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && <Badge className="bg-orange-600">SUSPENDIDO</Badge>}
                            <Button size="sm" variant="outline" onClick={() => setSelectedReportedUser(selectedReportedUser?.id === u.id ? null : u)}>
                              {selectedReportedUser?.id === u.id ? 'Ocultar' : 'Ver reportes'}
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {!u.banned && !u.isSuperAdmin && (
                            <>
                              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs" onClick={() => setBanDialog({ userId: u.id, username: u.username })}>Banear</Button>
                              <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs" onClick={() => setSuspendDialog({ userId: u.id, username: u.username })}>Suspender</Button>
                            </>
                          )}
                          {(u.banned || (u.suspendedUntil && new Date(u.suspendedUntil) > new Date())) && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-xs" onClick={() => { if (u.banned) handleUnban(u.id); else handleUnsuspend(u.id) }}>
                              {u.banned ? 'Desbanear' : 'Quitar suspensión'}
                            </Button>
                          )}
                        </div>
                        {selectedReportedUser?.id === u.id && u.reports.length > 0 && (
                          <div className="mt-3 p-2 bg-gray-900 rounded-lg space-y-1">
                            <p className="text-xs text-gray-400 font-medium">Historial de reportes:</p>
                            {u.reports.map((r: any) => (
                              <div key={r.id} className="text-xs text-gray-300 flex gap-2">
                                <span className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
                                <span>—</span>
                                <span>Por: {r.reporter.username}</span>
                                <span>—</span>
                                <span className="text-yellow-400">{r.reason}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {reportedUsers.length === 0 && <p className="text-gray-500 text-center py-8">No hay usuarios reportados</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ANNOUNCEMENTS TAB */}
          <TabsContent value="announcements">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-lg">Crear Anuncio</CardTitle><CardDescription>El anuncio se mostrará en la página principal de todos los usuarios</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <textarea className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 text-white text-sm h-24 resize-none" placeholder="Escribe el anuncio..." value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} />
                  <Button onClick={handleCreateAnnouncement} className="w-full bg-green-600 hover:bg-green-700">Publicar Anuncio</Button>
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-lg">Anuncios ({announcements.length})</CardTitle></CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-80">
                    <div className="space-y-2">
                      {announcements.map((a: any) => (
                        <div key={a.id} className={`p-3 rounded-lg border ${a.active ? 'bg-green-900/20 border-green-800' : 'bg-gray-800 border-gray-700'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm">{a.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                              {a.active && <Badge className="mt-1 bg-green-600 text-xs">ACTIVO</Badge>}
                            </div>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteAnnouncement(a.id)}>X</Button>
                          </div>
                        </div>
                      ))}
                      {announcements.length === 0 && <p className="text-gray-500 text-center py-8">No hay anuncios</p>}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Ban Dialog */}
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Banear a {banDialog?.username}</DialogTitle><DialogDescription className="text-gray-400">Esta acción es permanente hasta que un admin lo desbaneé</DialogDescription></DialogHeader>
          <Input placeholder="Razón del baneo" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-gray-800 border-gray-600" />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setBanDialog(null)}>Cancelar</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleBan}>Banear</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Suspender a {suspendDialog?.username}</DialogTitle><DialogDescription className="text-gray-400">Indica por cuántas horas</DialogDescription></DialogHeader>
          <Input type="number" placeholder="Horas de suspensión" value={suspendHours} onChange={(e) => setSuspendHours(e.target.value)} className="bg-gray-800 border-gray-600" min="1" />
          <div className="flex gap-2 flex-wrap">
            {[1, 6, 24, 72, 168].map((h) => (
              <Button key={h} size="sm" variant="outline" className={Number(suspendHours) === h ? 'bg-orange-600 border-orange-500' : ''} onClick={() => setSuspendHours(String(h))}>{h}h</Button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setSuspendDialog(null)}>Cancelar</Button>
            <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSuspend}>Suspender</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== ADMIN PANEL (NORMAL) ====================
function AdminView() {
  const user = useDhobbytvStore((s) => s.user)
  const verificationQueue = useDhobbytvStore((s) => s.verificationQueue)
  const setVerificationQueue = useDhobbytvStore((s) => s.setVerificationQueue)
  const [activeVerification, setActiveVerification] = useState<{ socketId: string; username: string; gender: string } | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [reportedUsers, setReportedUsers] = useState<any[]>([])
  const [selectedReportedUser, setSelectedReportedUser] = useState<any>(null)
  const [suspendDialog, setSuspendDialog] = useState<{ userId: string; username: string } | null>(null)
  const [suspendHours, setSuspendHours] = useState('')
  const [banDialog, setBanDialog] = useState<{ userId: string; username: string } | null>(null)
  const [banReason, setBanReason] = useState('')
  const socketRef = useRef<Socket | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const [adminStream, setAdminStream] = useState<MediaStream | null>(null)
  const onlineCount = useDhobbytvStore((s) => s.onlineCount)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [s, r] = await Promise.all([
          fetch('/api/admin-stats').then((res) => res.json()),
          fetch('/api/reported-users').then((res) => res.json()),
        ])
        if (!cancelled) { setStats(s); setReportedUsers(r.users || []) }
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const loadAdminData = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch('/api/admin-stats').then((res) => res.json()),
        fetch('/api/reported-users').then((res) => res.json()),
      ])
      setStats(s); setReportedUsers(r.users || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('user-online', { username: user?.username, gender: user?.gender, country: '', countryCode: '', verified: true, isAdmin: true })
      socket.emit('get-verification-queue')
    })
    socket.on('verification-queue', (data) => setVerificationQueue(data.queue))
    socket.on('online-count', (data) => useDhobbytvStore.getState().setOnlineCount(data.count))
    return () => { socket.disconnect() }
  }, [])

  useEffect(() => {
    if (!activeVerification || !socketRef.current) return
    let mounted = true
    const setupPeer = async () => {
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const dest = audioCtx.createMediaStreamDestination()
      oscillator.connect(dest); oscillator.start()
      const stream = dest.stream
      setAdminStream(stream)
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
      peerRef.current = pc
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      pc.onicecandidate = (e) => { if (e.candidate) socketRef.current?.emit('webrtc-ice-candidate', { targetId: activeVerification.socketId, candidate: e.candidate }) }
      pc.ontrack = (e) => { if (remoteVideoRef.current && mounted) remoteVideoRef.current.srcObject = e.streams[0] }
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      socketRef.current?.emit('webrtc-offer', { targetId: activeVerification.socketId, offer })
    }
    setupPeer()
    const handleAnswer = async (data: { fromId: string; answer: RTCSessionDescriptionInit }) => { if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer)) }
    const handleIce = (data: { fromId: string; candidate: RTCIceCandidateInit }) => { peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)) }
    socketRef.current.on('webrtc-answer', handleAnswer)
    socketRef.current.on('webrtc-ice-candidate', handleIce)
    return () => { mounted = false; peerRef.current?.close(); peerRef.current = null; audioCtx?.close?.(); stream?.getTracks().forEach((t) => t.stop()) }
  }, [activeVerification])

  const handleAccept = () => {
    if (!activeVerification || !socketRef.current) return
    socketRef.current.emit('admin-accept-verification', { userSocketId: activeVerification.socketId })
    fetch('/api/verify-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: activeVerification.username }) })
    cleanupVerification(); toast.success(`${activeVerification.username} verificado`); loadAdminData()
  }
  const handleReject = () => {
    if (!activeVerification || !socketRef.current) return
    socketRef.current.emit('admin-reject-verification', { userSocketId: activeVerification.socketId })
    fetch('/api/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: activeVerification.username }) })
    cleanupVerification(); toast.error(`${activeVerification.username} rechazado`); loadAdminData()
  }
  const cleanupVerification = () => { peerRef.current?.close(); peerRef.current = null; adminStream?.getTracks().forEach((t) => t.stop()); setAdminStream(null); setActiveVerification(null); if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null }
  const handleJoinVerification = (item: any) => { setActiveVerification({ socketId: item.socketId, username: item.username, gender: item.gender }); socketRef.current?.emit('admin-join-verification', { userSocketId: item.socketId }) }

  const handleBan = async () => {
    if (!banDialog || !banReason) return
    const res = await fetch('/api/ban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: banDialog.userId, reason: banReason }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`${banDialog.username} baneado`); setBanDialog(null); setBanReason(''); loadAdminData()
  }
  const handleSuspend = async () => {
    if (!suspendDialog || !suspendHours) return
    const res = await fetch('/api/suspend-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: suspendDialog.userId, hours: suspendHours }) })
    const data = await res.json()
    if (data.error) return toast.error(data.error)
    toast.success(`${suspendDialog.username} suspendido`); setSuspendDialog(null); setSuspendHours(''); loadAdminData()
  }
  const handleUnban = async (userId: string) => { await fetch('/api/unban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type: 'unban' }) }); toast.success('Desbaneado'); loadAdminData() }
  const handleUnsuspend = async (userId: string) => { await fetch('/api/unban-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, type: 'unsuspend' }) }); toast.success('Suspensión quitada'); loadAdminData() }

  const handleLogout = () => { socketRef.current?.disconnect(); useDhobbytvStore.getState().reset(); useDhobbytvStore.getState().setView('login') }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span><span className="text-blue-400 text-sm ml-2">ADMIN</span></h1>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-green-400 border-green-400">{onlineCount} online</Badge>
            <Button variant="outline" className="text-gray-400" onClick={handleLogout}>Salir</Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.totalUsers, color: 'text-purple-400' },
              { label: 'Verificados', value: stats.verifiedUsers, color: 'text-green-400' },
              { label: 'Pendientes', value: stats.pendingUsers, color: 'text-yellow-400' },
              { label: 'Baneados', value: stats.bannedUsers, color: 'text-red-400' },
              { label: 'Reportes', value: stats.totalReports, color: 'text-orange-400' },
            ].map((s) => (
              <Card key={s.label} className="bg-gray-900 border-gray-800"><CardContent className="p-3 text-center"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></CardContent></Card>
            ))}
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-lg">Cola de Verificación ({verificationQueue.length})</CardTitle></CardHeader>
            <CardContent>
              {verificationQueue.length === 0 ? <p className="text-gray-500 text-center py-8">Nadie esperando</p> : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {verificationQueue.map((item, i) => {
                      const waitMin = Math.floor((Date.now() - item.joinedAt) / 60000)
                      const waitSec = Math.floor(((Date.now() - item.joinedAt) % 60000) / 1000)
                      return (
                        <div key={item.socketId} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-3"><span className="text-gray-500 text-sm w-6">#{i + 1}</span><span>{getGenderShort(item.gender)}</span><div><p className="font-medium text-sm">{item.username}</p><p className="text-xs text-gray-500">{waitMin}m {waitSec}s</p></div></div>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={() => handleJoinVerification(item)} disabled={!!activeVerification}>Unirme</Button>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader><CardTitle className="text-lg">Verificación en Curso</CardTitle></CardHeader>
            <CardContent>
              {activeVerification ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" /><div className="absolute top-2 left-2 bg-gray-800/80 text-white text-xs px-2 py-1 rounded-full">{getGenderLabel(activeVerification.gender)} — {activeVerification.username}</div><div className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Tu cámara apagada</div></div>
                  <p className="text-gray-400 text-sm text-center">Pide que muestre su identificación</p>
                  <div className="flex gap-3"><Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleAccept}>Aceptar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReject}>Rechazar</Button></div>
                </div>
              ) : <div className="flex items-center justify-center py-16 text-gray-500">Selecciona una persona de la cola</div>}
            </CardContent>
          </Card>
        </div>

        {/* Reported Users Section */}
        <Card className="bg-gray-900 border-gray-800 mt-6">
          <CardHeader><CardTitle className="text-lg">Usuarios Reportados ({reportedUsers.length})</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {reportedUsers.sort((a: any, b: any) => b._count.reports - a._count.reports).map((u: any) => (
                  <div key={u.id} className={`p-3 rounded-lg border ${u.banned ? 'bg-red-900/20 border-red-800' : u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? 'bg-orange-900/20 border-orange-800' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span>{getGenderShort(u.gender)}</span>
                        <span className="font-medium text-sm">{u.username}</span>
                        <Badge variant={u._count.reports >= 5 ? 'destructive' : u._count.reports >= 3 ? 'secondary' : 'outline'} className={u._count.reports >= 3 ? 'bg-red-600 text-white' : u._count.reports >= 2 ? 'bg-orange-600 text-white' : ''}>{u._count.reports} reporte{u._count.reports !== 1 ? 's' : ''}</Badge>
                        {u.banned && <Badge className="bg-red-800">BANEADO</Badge>}
                        {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() && <Badge className="bg-orange-600">SUSPENDIDO</Badge>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {!u.banned && <><Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs" onClick={() => setBanDialog({ userId: u.id, username: u.username })}>Banear</Button><Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-xs" onClick={() => setSuspendDialog({ userId: u.id, username: u.username })}>Suspender</Button></>}
                        {(u.banned || (u.suspendedUntil && new Date(u.suspendedUntil) > new Date())) && <Button size="sm" className="bg-green-600 text-xs" onClick={() => { if (u.banned) handleUnban(u.id); else handleUnsuspend(u.id) }}>{u.banned ? 'Desbanear' : 'Quitar suspensión'}</Button>}
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setSelectedReportedUser(selectedReportedUser?.id === u.id ? null : u)}>Ver reportes</Button>
                      </div>
                    </div>
                    {selectedReportedUser?.id === u.id && u.reports.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-900 rounded-lg space-y-1">
                        {u.reports.map((r: any) => (
                          <div key={r.id} className="text-xs text-gray-300 flex gap-2"><span className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</span><span>—</span><span>Por: {r.reporter.username}</span><span>—</span><span className="text-yellow-400">{r.reason}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {reportedUsers.length === 0 && <p className="text-gray-500 text-center py-8">No hay usuarios reportados</p>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>

      {/* Ban Dialog */}
      <Dialog open={!!banDialog} onOpenChange={() => setBanDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Banear a {banDialog?.username}</DialogTitle><DialogDescription className="text-gray-400">Baneo permanente hasta que el super admin lo revierta</DialogDescription></DialogHeader>
          <Input placeholder="Razón del baneo" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="bg-gray-800 border-gray-600" />
          <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setBanDialog(null)}>Cancelar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleBan}>Banear</Button></div>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={() => setSuspendDialog(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader><DialogTitle>Suspender a {suspendDialog?.username}</DialogTitle></DialogHeader>
          <Input type="number" placeholder="Horas" value={suspendHours} onChange={(e) => setSuspendHours(e.target.value)} className="bg-gray-800 border-gray-600" min="1" />
          <div className="flex gap-2 flex-wrap">{[1, 6, 24, 72, 168].map((h) => (<Button key={h} size="sm" variant="outline" className={Number(suspendHours) === h ? 'bg-orange-600 border-orange-500' : ''} onClick={() => setSuspendHours(String(h))}>{h}h</Button>))}</div>
          <div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setSuspendDialog(null)}>Cancelar</Button><Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSuspend}>Suspender</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== MAIN VIEW ====================
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
  const socketRef = useRef<Socket | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showCountrySelect, setShowCountrySelect] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const createPeerConnection = useCallback((socket: Socket, targetId: string, isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] })
    peerRef.current = pc
    if (isInitiator) {
      const dc = pc.createDataChannel('chat')
      dc.onmessage = (e) => { if (partner) addMessage(partner.username, e.data) }
      dc.onopen = () => { dataChannelRef.current = dc }
      dataChannelRef.current = dc
    } else {
      pc.ondatachannel = (e) => { const dc = e.channel; dc.onmessage = (ev) => { if (partner) addMessage(partner.username, ev.data) }; dc.onopen = () => { dataChannelRef.current = dc }; dataChannelRef.current = dc }
    }
    pc.onicecandidate = (e) => { if (e.candidate) socket.emit('webrtc-ice-candidate', { targetId, candidate: e.candidate }) }
    pc.ontrack = (e) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0] }
    return pc
  }, [partner, addMessage])

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket'] })
    socketRef.current = socket
    socket.on('connect', () => { socket.emit('user-online', { username: user?.username, gender: user?.gender, country, countryCode, verified: true, isAdmin: false }) })
    socket.on('online-count', (data) => setOnlineCount(data.count))
    socket.on('searching', () => setSearching(true))
    socket.on('partner-found', async (data) => {
      setSearching(false); setPartner(data); clearMessages()
      addMessage('Sistema', `Conectado con ${data.username} ${getCountryFlag(data.countryCode)} ${data.country}`)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
      const pc = createPeerConnection(socket, data.peerSocketId, data.signal)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      if (data.signal) { const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socket.emit('webrtc-offer', { targetId: data.peerSocketId, offer }) }
    })
    socket.on('webrtc-offer', async (data) => {
      if (!peerRef.current) { const pc = createPeerConnection(socket, data.fromId, false); localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!)) }
      if (peerRef.current) { await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.offer)); const answer = await peerRef.current.createAnswer(); await peerRef.current.setLocalDescription(answer); socket.emit('webrtc-answer', { targetId: data.fromId, answer }) }
    })
    socket.on('webrtc-answer', async (data) => { if (peerRef.current) await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer)) })
    socket.on('webrtc-ice-candidate', (data) => { peerRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate)) })
    socket.on('partner-disconnected', () => { handleNext() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { localStreamRef.current?.getTracks().forEach((t) => t.stop()); peerRef.current?.close(); socket.disconnect() }
  }, [])

  const handleSearch = () => { if (socketRef.current && user) { clearMessages(); socketRef.current.emit('search-partner', { country: selectedCountry, hobbies }) } }

  const handleNext = useCallback(() => {
    if (socketRef.current) { socketRef.current.emit('next-partner'); socketRef.current.emit('stop-searching') }
    setPartner(null); clearMessages(); setSearching(false)
    peerRef.current?.close(); peerRef.current = null; dataChannelRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop()); localStreamRef.current = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
  }, [setPartner, clearMessages, setSearching])

  const handleSendMessage = () => { if (!chatInput.trim() || !dataChannelRef.current) return; dataChannelRef.current.send(chatInput); addMessage(user?.username || 'Tú', chatInput); setChatInput('') }
  const handleReport = async () => { if (!partner || !reportReason || !user) return; await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportedUsername: partner.username, reporterUsername: user.username, reason: reportReason }) }); toast.success('Reporte enviado'); setShowReport(false); setReportReason(''); handleNext() }
  const handleLogout = () => { handleNext(); socketRef.current?.disconnect(); useDhobbytvStore.getState().reset(); useDhobbytvStore.getState().setView('login') }

  const filteredCountries = COUNTRIES.filter((c) => c.code === 'all' || c.name.toLowerCase().includes(countrySearch.toLowerCase()))

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {announcement && <div className="bg-yellow-600 text-white text-center py-2 text-sm shrink-0">📢 {announcement}</div>}
      <header className="border-b border-gray-800 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <h1 className="text-xl font-black"><span className="text-purple-400">dhobby</span><span className="text-green-400">tv</span></h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-green-400 border-green-400 text-xs">{onlineCount} online</Badge>
            <span className="text-gray-400 text-sm hidden sm:inline">{getCountryFlag(countryCode)} {user?.username}</span>
            <Button variant="ghost" size="sm" className="text-gray-400" onClick={handleLogout}>Salir</Button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full p-4">
        {!partner && !isSearching && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center"><h2 className="text-3xl font-bold mb-2">{getGenderShort(user?.gender || '')} Hola, {user?.username}</h2><p className="text-gray-400">Selecciona tus preferencias y busca alguien</p></div>
            <Card className="w-full max-w-md bg-gray-900 border-gray-800"><CardContent className="p-4">
              <p className="text-sm text-gray-400 mb-3">Filtrar por país:</p>
              <div className="relative">
                <button onClick={() => setShowCountrySelect(!showCountrySelect)} className="w-full flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
                  <span className="flex items-center gap-2">{getCountryFlag(selectedCountry)} {getCountryName(selectedCountry)}</span>
                  <svg className={`w-4 h-4 transition-transform ${showCountrySelect ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {showCountrySelect && (
                  <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-hidden">
                    <div className="p-2"><Input placeholder="Buscar país..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} className="bg-gray-700 border-gray-600 text-sm" autoFocus /></div>
                    <ScrollArea className="max-h-48">{filteredCountries.map((c) => (
                      <button key={c.code} onClick={() => { setSelectedCountry(c.code); setShowCountrySelect(false); setCountrySearch('') }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors flex items-center gap-2 ${selectedCountry === c.code ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300'}`}>{c.flag} {c.name}</button>
                    ))}</ScrollArea>
                  </div>
                )}
              </div>
            </CardContent></Card>
            <Card className="w-full max-w-md bg-gray-900 border-gray-800"><CardContent className="p-4">
              <p className="text-sm text-gray-400 mb-3">Tus intereses (opcional):</p>
              <div className="flex flex-wrap gap-2">{HOBBIES.map((h) => (<button key={h.id} onClick={() => toggleHobby(h.id)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${hobbies.includes(h.id) ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}>{h.icon} {h.label}</button>))}</div>
            </CardContent></Card>
            <Button onClick={handleSearch} className="bg-green-600 hover:bg-green-700 text-white font-bold px-12 py-7 text-xl rounded-2xl">Buscar Persona</Button>
          </div>
        )}
        {isSearching && !partner && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4"><div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /><p className="text-gray-400 text-lg">Buscando persona...</p><Button variant="outline" className="text-gray-400" onClick={handleNext}>Cancelar</Button></div>
        )}
        {partner && (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2"><span>{getGenderShort(partner.gender)}</span><span className="font-medium">{partner.username}</span><span className="text-gray-400">{getCountryFlag(partner.countryCode)} {partner.country}</span></div>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-0"><video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" /><div className="absolute bottom-3 right-3 w-32 h-24 sm:w-40 sm:h-30 rounded-lg overflow-hidden border-2 border-purple-500 shadow-lg"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div></div>
            <div className="bg-gray-900 rounded-lg h-32 overflow-y-auto p-3 space-y-1">{messages.map((msg, i) => (<p key={i} className={`text-sm ${msg.from === 'Sistema' ? 'text-purple-400 italic' : msg.from === user?.username ? 'text-green-400' : 'text-gray-300'}`}><span className="font-medium">{msg.from}:</span> {msg.text}</p>))}<div ref={messagesEndRef} /></div>
            <div className="flex gap-2"><Input placeholder="Escribe un mensaje..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} className="bg-gray-800 border-gray-700 text-white flex-1" /><Button onClick={handleSendMessage} className="bg-purple-600 hover:bg-purple-700">Enviar</Button></div>
            <div className="flex gap-2"><Button onClick={handleNext} className="flex-1 bg-blue-600 hover:bg-blue-700">Siguiente</Button><Button variant="outline" className="flex-1 border-red-600 text-red-400 hover:bg-red-600 hover:text-white" onClick={() => setShowReport(true)}>Reportar</Button></div>
          </div>
        )}
      </main>
      <Dialog open={showReport} onOpenChange={setShowReport}><DialogContent className="bg-gray-900 border-gray-700 text-white"><DialogHeader><DialogTitle>Reportar a {partner?.username}</DialogTitle><DialogDescription className="text-gray-400">Reporta si esta persona hace algo inapropiado</DialogDescription></DialogHeader><Input placeholder="Razón del reporte" value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="bg-gray-800 border-gray-600" /><div className="flex gap-3"><Button variant="outline" className="flex-1" onClick={() => setShowReport(false)}>Cancelar</Button><Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleReport}>Reportar</Button></div></DialogContent></Dialog>
    </div>
  )
}

// ==================== MAIN APP ====================
export default function DhobbytvApp() {
  const view = useDhobbytvStore((s) => s.view)
  const setCountry = useDhobbytvStore((s) => s.setCountry)
  const setAnnouncement = useDhobbytvStore((s) => s.setAnnouncement)

  useEffect(() => {
    fetch('/api/geoip').then((r) => r.json()).then((data) => setCountry(data.country, data.countryCode)).catch(() => setCountry('Desconocido', 'XX'))
    fetch('/api/announcements').then((r) => r.json()).then((data) => { if (data.announcement) setAnnouncement(data.announcement.text) }).catch(() => {})
  }, [])

  useEffect(() => { fetch('/api/setup-admin').catch(() => {}) }, [])

  const views: Record<AppView, JSX.Element> = {
    login: <LoginView />, register: <RegisterView />, verification: <VerificationView />,
    'verification-waiting': <VerificationView />, 'verification-video': <VerificationVideoView />,
    admin: <AdminView />, 'super-admin': <SuperAdminView />, main: <MainView />, chat: <MainView />,
  }

  return (<>{views[view] || <LoginView />}<Toaster position="top-center" richColors /></>)
}