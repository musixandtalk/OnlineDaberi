// Firestore データ操作ユーティリティ
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from './firebase'
import type { User, Room, Club } from '@/types'

// =============================================
// ユーザー操作
// =============================================

// ユーザードキュメントを作成
export const createUserDocument = async (
  uid: string,
  data: Omit<User, 'id'>,
) => {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

// ユーザードキュメントを取得（単発）
export const getUserDocument = async (uid: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as User
}

// ユーザー情報を更新
export const updateUserDocument = async (
  uid: string,
  data: Partial<Omit<User, 'id'>>,
) => {
  await updateDoc(doc(db, 'users', uid), data)
}

// =============================================
// 部屋操作
// =============================================

// アクティブな部屋一覧をリアルタイム監視
export const subscribeToRooms = (
  callback: (rooms: Room[]) => void,
  constraints: QueryConstraint[] = [],
) => {
  const q = query(
    collection(db, 'rooms'),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(20),
    ...constraints,
  )

  return onSnapshot(q, (snap) => {
    const rooms = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as Room[]
    callback(rooms)
  })
}

// 部屋を作成
export const createRoom = async (
  hostId: string,
  data: Partial<Omit<Room, 'id' | 'createdAt'>>,
) => {
  const docRef = await addDoc(collection(db, 'rooms'), {
    ...data,
    hostId,
    isActive: true,
    participantCount: 1,
    speakers: [],
    listeners: [],
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

// 部屋を取得（単発）
export const getRoom = async (roomId: string): Promise<Room | null> => {
  const snap = await getDoc(doc(db, 'rooms', roomId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Room
}

// 部屋をリアルタイム監視
export const subscribeToRoom = (
  roomId: string,
  callback: (room: Room | null) => void,
) => {
  return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
    if (!snap.exists()) {
      callback(null)
      return
    }
    callback({ id: snap.id, ...snap.data() } as Room)
  })
}

// 部屋を削除（終了）
export const closeRoom = async (roomId: string) => {
  await updateDoc(doc(db, 'rooms', roomId), {
    isActive: false,
    closedAt: serverTimestamp(),
  })
}

// =============================================
// クラブ操作
// =============================================

// クラブ一覧を取得
export const subscribeToClubs = (
  callback: (clubs: Club[]) => void,
) => {
  const q = query(
    collection(db, 'clubs'),
    orderBy('memberCount', 'desc'),
    limit(20),
  )

  return onSnapshot(q, (snap) => {
    const clubs = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })) as Club[]
    callback(clubs)
  })
}

// クラブを作成
export const createClub = async (
  data: Partial<Omit<Club, 'id' | 'createdAt'>>,
) => {
  const docRef = await addDoc(collection(db, 'clubs'), {
    ...data,
    memberCount: 1,
    followCount: 0,
    memberIds: [],
    moderatorIds: [],
    createdAt: serverTimestamp(),
  })
  return docRef.id
}
