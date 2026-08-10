import { create } from 'zustand'

export type AppView = 'login' | 'register' | 'verification' | 'verification-waiting' | 'verification-video' | 'admin' | 'main' | 'chat'

interface UserInfo {
  id: string
  username: string
  gender: string
  verified: boolean
  isAdmin: boolean
}

interface PartnerInfo {
  peerSocketId: string
  username: string
  gender: string
  country: string
  countryCode: string
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
    socketId: string
    username: string
    gender: string
    joinedAt: number
  }>
  verificationAdminSocketId: string | null
  messages: Array<{ from: string; text: string; time: string }>

  setView: (view: AppView) => void
  setUser: (user: UserInfo | null) => void
  setPartner: (partner: PartnerInfo | null) => void
  setCountry: (country: string, code: string) => void
  setSelectedCountry: (country: string) => void
  toggleHobby: (hobby: string) => void
  setSearching: (searching: boolean) => void
  setOnlineCount: (count: number) => void
  setVerificationQueue: (queue: DhobbytvState['verificationQueue']) => void
  setVerificationAdminSocketId: (id: string | null) => void
  addMessage: (from: string, text: string) => void
  clearMessages: () => void
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
  verificationAdminSocketId: null,
  messages: [],
}

export const useDhobbytvStore = create<DhobbytvState>((set) => ({
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
  setVerificationAdminSocketId: (id) => set({ verificationAdminSocketId: id }),
  addMessage: (from, text) =>
    set((state) => ({
      messages: [...state.messages, { from, text, time: new Date().toLocaleTimeString() }],
    })),
  clearMessages: () => set({ messages: [] }),
  reset: () => set(initialState),
}))
