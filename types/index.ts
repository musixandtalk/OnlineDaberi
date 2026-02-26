// アプリ全体で使用する型定義
export interface User {
  id: string
  username: string
  displayName: string
  bio: string
  avatarUrl: string | null
  followers: string[]
  following: string[]
  clubIds: string[]
  isAnonymous: boolean   // 匿名（ゲスト）ユーザーかどうか
  createdAt: Date
}

export interface Room {
  id: string
  name: string
  description: string
  hostId: string
  hostName: string
  hostAvatar: string | null
  clubId: string | null
  clubName: string | null
  isPublic: boolean
  tags: string[]
  participantCount: number
  speakers: RoomParticipant[]
  listeners: RoomParticipant[]
  livekitRoomName: string
  createdAt: Date
}

export interface RoomParticipant {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  role: 'host' | 'speaker' | 'listener'
  isMuted: boolean
  isSpeaking: boolean
  handRaised: boolean
}

export interface Club {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string | null
  tags: string[]
  memberCount: number
  followCount: number
  moderatorIds: string[]
  memberIds: string[]
  isFollowing: boolean
  createdAt: Date
}

export interface ScheduledEvent {
  id: string
  title: string
  description: string
  hostId: string
  hostName: string
  clubId: string | null
  clubName: string | null
  scheduledAt: Date
  durationMinutes: number
  participantCount: number
  isJoined: boolean
}

// 音声ゾーンの種類（Connect.Club のコンセプトを流用）
export type ZoneType = 'entrance' | 'speaker' | 'listener' | 'quiet' | 'restricted'

export interface RoomZone {
  id: string
  type: ZoneType
  x: number
  y: number
  width: number
  height: number
  label: string
}
