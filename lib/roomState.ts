// ルーム内リアルタイム状態管理（Firebase Realtime Database）
// スピーカー/リスナー/モデレーター/手挙げを管理する
import {
    ref,
    set,
    update,
    get,
    onValue,
    off,
    serverTimestamp,
} from 'firebase/database'
import { rtdb as db } from './firebase'

// ─── 型定義 ────────────────────────────────────────
export type ParticipantRole = 'host' | 'moderator' | 'speaker' | 'listener'

export interface RoomMember {
    uid: string          // Firebase UID または匿名ID
    displayName: string
    role: ParticipantRole
    isMuted: boolean
    joinedAt: number     // timestamp (ms)
}

export interface RoomState {
    roomId: string
    hostUid: string
    moderatorUids: string[]    // モデレーター権限を持つUID
    speakerUids: string[]      // ステージ上にいるUID（host+moderator+speaker）
    listenerUids: string[]     // リスナーとして聴いているUID
    raisedHandUids: string[]   // 手を挙げているUID
    members: Record<string, RoomMember>  // uid→メンバー情報
    createdAt: number
}

// ─── ルーム状態のパス ───────────────────────────────
const roomStateRef = (roomId: string) => ref(db, `roomStates/${roomId}`)

// ─── ルーム状態を初期化（ホストが作るとき） ─────────
export const initRoomState = async (
    roomId: string,
    hostUid: string,
    hostName: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (snap.exists()) {
        const data = snap.val() as RoomState
        const members = data.members || {}
        if (!members[hostUid]) {
            let speakers = data.speakerUids || []
            if (!Array.isArray(speakers)) speakers = Object.values(speakers)
            if (!speakers.includes(hostUid)) speakers.push(hostUid)

            await update(roomStateRef(roomId), {
                speakerUids: speakers,
                [`members/${hostUid}`]: {
                    uid: hostUid,
                    displayName: hostName,
                    role: 'speaker',
                    isMuted: true,
                    joinedAt: Date.now(),
                }
            })
        }
        return
    }

    const hostMember: RoomMember = {
        uid: hostUid,
        displayName: hostName,
        role: 'host',
        isMuted: false,
        joinedAt: Date.now(),
    }
    await set(roomStateRef(roomId), {
        roomId,
        hostUid,
        moderatorUids: [hostUid],
        speakerUids: [hostUid],
        listenerUids: [],
        raisedHandUids: [],
        members: { [hostUid]: hostMember },
        createdAt: serverTimestamp(),
    })
}

// ─── リスナーとして参加 ───────────────────────────
export const joinAsListener = async (
    roomId: string,
    uid: string,
    displayName: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState
    const members = data.members || {}
    if (members[uid]) return

    let listeners = data.listenerUids || []
    if (!Array.isArray(listeners)) listeners = Object.values(listeners)
    if (!listeners.includes(uid)) listeners.push(uid)

    const member: RoomMember = {
        uid,
        displayName,
        role: 'listener',
        isMuted: true,
        joinedAt: Date.now(),
    }
    await update(roomStateRef(roomId), {
        listenerUids: listeners,
        [`members/${uid}`]: member,
    })
}

// ─── 手を挙げる / 下げる ─────────────────────────
export const setHandRaised = async (
    roomId: string,
    uid: string,
    raised: boolean,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState
    let hands = data.raisedHandUids || []
    if (!Array.isArray(hands)) hands = Object.values(hands)

    if (raised) {
        if (!hands.includes(uid)) hands.push(uid)
    } else {
        hands = hands.filter((id: string) => id !== uid)
    }
    await update(roomStateRef(roomId), { raisedHandUids: hands })
}

// ─── リスナー → スピーカーに昇格 ──────────────────
export const promoteToSpeaker = async (
    roomId: string,
    uid: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState

    let speakers = data.speakerUids || []
    let listeners = data.listenerUids || []
    let hands = data.raisedHandUids || []
    if (!Array.isArray(speakers)) speakers = Object.values(speakers)
    if (!Array.isArray(listeners)) listeners = Object.values(listeners)
    if (!Array.isArray(hands)) hands = Object.values(hands)

    if (!speakers.includes(uid)) speakers.push(uid)
    listeners = listeners.filter((id: string) => id !== uid)
    hands = hands.filter((id: string) => id !== uid)

    await update(roomStateRef(roomId), {
        speakerUids: speakers,
        listenerUids: listeners,
        raisedHandUids: hands,
        [`members/${uid}/role`]: 'speaker',
        [`members/${uid}/isMuted`]: false,
    })
}

// ─── スピーカー → リスナーに降格 ──────────────────
export const demoteToListener = async (
    roomId: string,
    uid: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState

    let speakers = data.speakerUids || []
    let listeners = data.listenerUids || []
    if (!Array.isArray(speakers)) speakers = Object.values(speakers)
    if (!Array.isArray(listeners)) listeners = Object.values(listeners)

    speakers = speakers.filter((id: string) => id !== uid)
    if (!listeners.includes(uid)) listeners.push(uid)

    await update(roomStateRef(roomId), {
        speakerUids: speakers,
        listenerUids: listeners,
        [`members/${uid}/role`]: 'listener',
        [`members/${uid}/isMuted`]: true,
    })
}

// ─── モデレーター権限の付与 ───────────────────────
export const grantModerator = async (
    roomId: string,
    uid: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState

    let mods = data.moderatorUids || []
    if (!Array.isArray(mods)) mods = Object.values(mods)
    if (!mods.includes(uid)) mods.push(uid)

    await update(roomStateRef(roomId), {
        moderatorUids: mods,
        [`members/${uid}/role`]: 'moderator',
    })
}

// ─── モデレーター権限の剥奪 ───────────────────────
export const revokeModerator = async (
    roomId: string,
    uid: string,
    hostUid: string,
): Promise<void> => {
    if (uid === hostUid) return
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState

    let mods = data.moderatorUids || []
    if (!Array.isArray(mods)) mods = Object.values(mods)
    mods = mods.filter((id: string) => id !== uid)

    await update(roomStateRef(roomId), {
        moderatorUids: mods,
        [`members/${uid}/role`]: 'speaker',
    })
}

// ─── ミュート状態を更新 ───────────────────────────
export const updateMuteState = async (
    roomId: string,
    uid: string,
    isMuted: boolean,
): Promise<void> => {
    await update(roomStateRef(roomId), {
        [`members/${uid}/isMuted`]: isMuted,
    })
}

// ─── 退出処理 ────────────────────────────────────
export const leaveRoom = async (
    roomId: string,
    uid: string,
): Promise<void> => {
    const snap = await get(roomStateRef(roomId))
    if (!snap.exists()) return
    const data = snap.val() as RoomState

    let speakers = data.speakerUids || []
    let listeners = data.listenerUids || []
    let hands = data.raisedHandUids || []
    if (!Array.isArray(speakers)) speakers = Object.values(speakers)
    if (!Array.isArray(listeners)) listeners = Object.values(listeners)
    if (!Array.isArray(hands)) hands = Object.values(hands)

    speakers = speakers.filter((id: string) => id !== uid)
    listeners = listeners.filter((id: string) => id !== uid)
    hands = hands.filter((id: string) => id !== uid)

    await update(roomStateRef(roomId), {
        speakerUids: speakers,
        listenerUids: listeners,
        raisedHandUids: hands,
        [`members/${uid}`]: null, // 値をnullにするとフィールドが削除される
    }).catch(() => { })
}

// ─── リアルタイム購読 ─────────────────────────────
export const subscribeToRoomState = (
    roomId: string,
    callback: (state: RoomState | null) => void,
): (() => void) => {
    const r = roomStateRef(roomId)
    const handle = onValue(r, (snap) => {
        if (!snap.exists()) {
            callback(null)
            return
        }
        const data = snap.val() as RoomState
        // RTDBは空配列を保存しないためフォールバック処理
        data.speakerUids = data.speakerUids ? (Array.isArray(data.speakerUids) ? data.speakerUids : Object.values(data.speakerUids)) : []
        data.listenerUids = data.listenerUids ? (Array.isArray(data.listenerUids) ? data.listenerUids : Object.values(data.listenerUids)) : []
        data.raisedHandUids = data.raisedHandUids ? (Array.isArray(data.raisedHandUids) ? data.raisedHandUids : Object.values(data.raisedHandUids)) : []
        data.moderatorUids = data.moderatorUids ? (Array.isArray(data.moderatorUids) ? data.moderatorUids : Object.values(data.moderatorUids)) : []
        data.members = data.members || {}

        callback(data)
    })
    return () => off(r, 'value', handle)
}

