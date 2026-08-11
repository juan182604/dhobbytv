import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppView = 'login' | 'register' | 'verification-pending' | 'verification' | 'admin' | 'admin-verification' | 'super-admin' | 'main' | 'chat'

interface UserInfo {
  id: string
  username: string
  gender: string
  verified: boolean
  isAdmin: boolean
  isSuperAdmin: boolean
}

interface PartnerInfo {
  peerSocketId: string
  username: string
  gender: string
  country: string
  countryCode: string
}

interface VerificationTarget {
  peerId: string
  username: string
  gender: string
}

interface DhobbytvState {
  view: AppView
  user: UserInfo | null
  partner: PartnerInfo | null
  country: string
  countryCode: string
  selectedCountry: string
  hobbies: string[]
  isSearching: boolean
  onlineCount: number
  verificationQueue: Array<{
    peerId: string
    username: string
    gender: string
    timestamp: number
  }>
  verificationAdminPeerId: string | null
  verificationTarget: VerificationTarget | null
  verificationMessages: Array<{ from: string; text: string; time: string }>
  messages: Array<{ from: string; text: string; time: string }>
  announcement: string | null

  setView: (view: AppView) => void
  setUser: (user: UserInfo | null) => void
  setPartner: (partner: PartnerInfo | null) => void
  setCountry: (country: string, code: string) => void
  setSelectedCountry: (country: string) => void
  toggleHobby: (hobby: string) => void
  setSearching: (searching: boolean) => void
  setOnlineCount: (count: number) => void
  setVerificationQueue: (queue: DhobbytvState['verificationQueue']) => void
  setVerificationAdminPeerId: (id: string | null) => void
  setVerificationTarget: (target: VerificationTarget | null) => void
  addMessage: (from: string, text: string) => void
  addVerificationMessage: (from: string, text: string) => void
  clearMessages: () => void
  clearVerificationMessages: () => void
  setAnnouncement: (text: string | null) => void
  reset: () => void
}

const initialState = {
  view: 'login' as AppView,
  user: null as UserInfo | null,
  partner: null as PartnerInfo | null,
  country: '',
  countryCode: '',
  selectedCountry: 'all',
  hobbies: [] as string[],
  isSearching: false,
  onlineCount: 0,
  verificationQueue: [],
  verificationAdminPeerId: null,
  verificationTarget: null as VerificationTarget | null,
  verificationMessages: [] as Array<{ from: string; text: string; time: string }>,
  messages: [],
  announcement: null as string | null,
}

export const useDhobbytvStore = create<DhobbytvState>()(
  persist(
    (set) => ({
  ...initialState,
  setView: (view) => set({ view }),
  setUser: (user) => set({ user }),
  setPartner: (partner) => set({ partner }),
  setCountry: (country, code) => set({ country, countryCode: code }),
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  toggleHobby: (hobby) =>
    set((state) => ({
      hobbies: state.hobbies.includes(hobby)
        ? state.hobbies.filter((h) => h !== hobby)
        : [...state.hobbies, hobby],
    })),
  setSearching: (searching) => set({ isSearching: searching }),
  setOnlineCount: (count) => set({ onlineCount: count }),
  setVerificationQueue: (queue) => set({ verificationQueue: queue }),
  setVerificationAdminPeerId: (id) => set({ verificationAdminPeerId: id }),
  setVerificationTarget: (target) => set({ verificationTarget: target }),
  addMessage: (from, text) =>
    set((state) => ({
      messages: [...state.messages, { from, text, time: new Date().toLocaleTimeString() }],
    })),
  addVerificationMessage: (from, text) =>
    set((state) => ({
      verificationMessages: [...state.verificationMessages, { from, text, time: new Date().toLocaleTimeString() }],
    })),
  clearMessages: () => set({ messages: [] }),
  clearVerificationMessages: () => set({ verificationMessages: [] }),
  setAnnouncement: (text) => set({ announcement: text }),
  reset: () => set(initialState),
}),
    {
      name: 'dhobbytv-session',
      partialize: (state) => ({
        user: state.user,
        // No persistir vistas P2P que requieren conexiones vivas
        view: ['admin-verification', 'chat'].includes(state.view)
          ? (state.user?.isAdmin || state.user?.isSuperAdmin ? 'admin' : state.user?.verified ? 'main' : 'verification-pending')
          : state.view,
        country: state.country,
        countryCode: state.countryCode,
      }),
    }
  )
)
