// Zustand グローバル状態管理ストア
import { create } from 'zustand'
import type { User, Room } from '@/types'

// 認証ストア
interface AuthStore {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}))

// 現在参加中の部屋ストア
interface RoomStore {
  currentRoom: Room | null
  isConnecting: boolean
  isMuted: boolean
  handRaised: boolean
  setCurrentRoom: (room: Room | null) => void
  setConnecting: (connecting: boolean) => void
  toggleMute: () => void
  toggleHandRaise: () => void
}

export const useRoomStore = create<RoomStore>((set) => ({
  currentRoom: null,
  isConnecting: false,
  isMuted: true, // デフォルトはミュート
  handRaised: false,
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setConnecting: (isConnecting) => set({ isConnecting }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleHandRaise: () => set((state) => ({ handRaised: !state.handRaised })),
}))

// UIストア（モーダル・サイドバーの開閉状態）
interface UIStore {
  isSidebarOpen: boolean
  isCreateRoomModalOpen: boolean
  toggleSidebar: () => void
  setCreateRoomModal: (open: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  isSidebarOpen: true,
  isCreateRoomModalOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setCreateRoomModal: (open) => set({ isCreateRoomModalOpen: open }),
}))
