'use client'
// オンダベ — 音声部屋ページ（LiveKit 音声通話・モデレーター・リアルタイム参加者管理）
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  LiveKitRoom,
  useLocalParticipant,
  useConnectionState,
  useRemoteParticipants,
  useRemoteParticipant,
  useIsSpeaking,
  RoomAudioRenderer,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { ConnectionState } from 'livekit-client'
import { mockRooms } from '@/lib/mockData'
import type { Room, RoomParticipant } from '@/types'
import BGMPlayer from '@/components/BGMPlayer/BGMPlayer'
import UpgradeBanner from '@/components/UpgradeBanner/UpgradeBanner'
import MicrophoneSelector from '@/components/MicrophoneSelector/MicrophoneSelector'
import {
  type RoomState,
  type RoomMember,
  initRoomState,
  joinAsListener,
  subscribeToRoomState,
  setHandRaised,
  promoteToSpeaker,
  demoteToListener,
  grantModerator,
  revokeModerator,
  updateMuteState,
  leaveRoom as leaveRoomState,
  closeRoom,
} from '@/lib/roomState'
import styles from './room.module.css'

// リアクション定義（各リアクション専用の音色関数を持つ）
// playSound は後の専用関数を参照するため、REACTIONS は定数として後で定義
const REACTION_DEFS = [
  { emoji: '👏', label: '拍手', key: 'clap' },
  { emoji: '😂', label: '笑い', key: 'laugh' },
  { emoji: '❤️', label: 'ハート', key: 'heart' },
  { emoji: '🔥', label: 'Fire', key: 'fire' },
  { emoji: '🎉', label: '祝', key: 'party' },
  { emoji: '💯', label: '最高', key: 'coin' },
]


// 名前のイニシャルを返すユーティリティ
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

// モックチャットメッセージ
const MOCK_MESSAGES = [
  { id: 'm1', userId: 'u1', userName: 'Yuki Tanaka', text: 'よろしくお願いします！今日はProduct Huntを中心に話しましょう', time: '22:31' },
  { id: 'm2', userId: 'u2', userName: 'Maria Kim', text: 'Figmaの新しいAI機能、みんなもう使いましたか？', time: '22:33' },
  { id: 'm3', userId: 'u3', userName: 'Alex Wang', text: '使いました！かなり変わりますよね 🔥', time: '22:35' },
  { id: 'm4', userId: 'u5', userName: 'Jake Mori', text: 'Cursor AIも合わせて使うと最強ですよ', time: '22:37' },
]

// ─── 発話状態を監視するアバター ───
function SpeakerAvatar({ lkParticipant, isMe, avatarUrl, displayName, memberRole, participantRole, isMuted }: any) {
  if (!lkParticipant) return <AvatarView isSpeaking={false} isMe={isMe} avatarUrl={avatarUrl} displayName={displayName} memberRole={memberRole} participantRole={participantRole} isMuted={isMuted} />
  return <SpeakerAvatarActive lkParticipant={lkParticipant} isMe={isMe} avatarUrl={avatarUrl} displayName={displayName} memberRole={memberRole} participantRole={participantRole} isMuted={isMuted} />
}

function SpeakerAvatarActive({ lkParticipant, ...props }: any) {
  const isSpeaking = useIsSpeaking(lkParticipant)
  return <AvatarView isSpeaking={isSpeaking} {...props} />
}

function AvatarView({ isSpeaking, isMe, avatarUrl, displayName, memberRole, participantRole, isMuted }: any) {
  return (
    <div
      className={`${styles.bubbleAvatar} ${isSpeaking ? styles.speaking : ''}`}
      style={isMe ? {
        outline: isSpeaking ? '3px solid #ec4899' : '3px solid rgba(99, 102, 241, 0.4)',
        outlineOffset: 2,
        overflow: 'hidden',
        padding: 0,
        transition: 'all 0.2s ease',
      } : undefined}
    >
      {isMe && avatarUrl ? (
        <img src={avatarUrl} alt="自分のアイコン" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        getInitials(displayName)
      )}
      {(memberRole === 'host' || participantRole === 'host') && (
        <span className={styles.hostCrown}>👑</span>
      )}
      {memberRole === 'moderator' && participantRole !== 'host' && (
        <span className={styles.hostCrown}>🛡️</span>
      )}
      <span className={`${styles.micStatus} ${isMuted ? styles.muted : styles.active}`}>
        {isMuted ? '🔇' : '🎙️'}
      </span>
    </div>
  )
}

// ─── スピーカーバブル（モデレーターメニュー付き） ──
function SpeakerBubble({
  participant,
  isMe = false,
  avatarUrl,
  isModerator = false,
  onPromote,
  onDemote,
  onGrantMod,
  onRevokeMod,
  isHost = false,
  memberRole,
}: {
  participant: RoomParticipant
  isMe?: boolean
  avatarUrl?: string | null
  isModerator?: boolean      // 自分がモデレーターか
  onPromote?: () => void
  onDemote?: () => void
  onGrantMod?: () => void
  onRevokeMod?: () => void
  isHost?: boolean           // このバブルの人がホストか
  memberRole?: string        // このバブルの人のロール
}) {
  const [showMenu, setShowMenu] = useState(false)

  // ─── LiveKit から実際の発話状態を取得 ───
  const { localParticipant } = useLocalParticipant()
  const remoteParticipant = useRemoteParticipant(participant.userId)
  const lkParticipant = isMe ? localParticipant : remoteParticipant

  return (
    <div className={styles.participantBubble} style={{ position: 'relative' }}>
      {/* 「あなた」バッジ */}
      {isMe && (
        <span style={{
          position: 'absolute', top: -10, left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white', fontSize: '0.6rem', fontWeight: 700,
          padding: '2px 7px', borderRadius: 20, whiteSpace: 'nowrap',
          zIndex: 2, letterSpacing: '0.04em',
        }}>
          ★ あなた
        </span>
      )}
      <SpeakerAvatar
        lkParticipant={lkParticipant}
        isMe={isMe}
        avatarUrl={avatarUrl}
        displayName={participant.displayName}
        memberRole={memberRole}
        participantRole={participant.role}
        isMuted={participant.isMuted}
      />
      <span className={styles.bubbleName}>
        {isMe ? 'あなた' : participant.displayName}
      </span>
      <span className={styles.bubbleRole}>
        {memberRole === 'host' ? '👑 ホスト' : memberRole === 'moderator' ? '🛡️ モデレーター' : '🎙️ スピーカー'}
      </span>

      {/* モデレーターメニュー（自分がモデレーターで、かつ相手がホストでない時） */}
      {isModerator && !isMe && !isHost && (
        <div style={{ position: 'relative', marginTop: 4 }}>
          <button
            className={styles.modMenuBtn}
            onClick={() => setShowMenu(v => !v)}
            title="管理操作"
          >⋯</button>
          {showMenu && (
            <div className={styles.modMenu}>
              {onDemote && (
                <button className={styles.modMenuItem} onClick={() => { onDemote(); setShowMenu(false) }}>
                  ⬇️ リスナーに移動
                </button>
              )}
              {onGrantMod && memberRole !== 'moderator' && (
                <button className={styles.modMenuItem} onClick={() => { onGrantMod(); setShowMenu(false) }}>
                  🛡️ モデレーター権限を付与
                </button>
              )}
              {onRevokeMod && memberRole === 'moderator' && (
                <button className={styles.modMenuItemDanger} onClick={() => { onRevokeMod(); setShowMenu(false) }}>
                  ❌ モデレーター権限を剥奪
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// リスナーバブルコンポーネント
function ListenerBubble({
  participant,
  isMe = false,
  avatarUrl,
}: {
  participant: RoomParticipant
  isMe?: boolean
  avatarUrl?: string | null
}) {
  return (
    <div className={styles.listenerBubble} style={{ position: 'relative' }}>
      {isMe && (
        <span style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          fontSize: '0.55rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          zIndex: 2,
        }}>
          ★ あなた
        </span>
      )}
      <div
        className={styles.listenerAvatar}
        style={isMe ? { outline: '3px solid #6366f1', outlineOffset: 2, overflow: 'hidden', padding: 0 } : undefined}
      >
        {isMe && avatarUrl ? (
          <img
            src={avatarUrl}
            alt="自分のアイコン"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          getInitials(participant.displayName)
        )}
        {participant.handRaised && (
          <span className={styles.handRaisedBadge}>✋</span>
        )}
      </div>
      <span className={styles.listenerName}>
        {isMe ? 'あなた' : participant.displayName}
      </span>
    </div>
  )
}

// LiveKit マイクコントロール（実際の音声通話に接続するコンポーネント）
function MicControl({ isMuted, onToggle }: { isMuted: boolean; onToggle: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const connectionState = useConnectionState()
  const isConnected = connectionState === ConnectionState.Connected

  // マイクのON/OFFを LiveKit に反映
  useEffect(() => {
    if (!localParticipant || !isConnected) return
    localParticipant.setMicrophoneEnabled(!isMuted)
  }, [isMuted, localParticipant, isConnected])

  return (
    <span className={`${styles.controlBtnIcon}`}>
      {!isConnected ? '⏳' : isMuted ? '🔇' : '🎙️'}
    </span>
  )
}

// リモート参加者の音量を個別に変更するコンポーネント
function RemoteVolumeControl({ participantIdentity, displayName }: { participantIdentity: string; displayName: string }) {
  const remoteParticipants = useRemoteParticipants()
  const [volume, setVolume] = useState(100)

  // 音量変更を LiveKit の参加者に反映
  const handleVolumeChange = (val: number) => {
    setVolume(val)
    const participant = remoteParticipants.find(p => p.identity === participantIdentity)
    if (participant) {
      // LiveKit の audioTrack に音量を設定（0.0〜1.0）
      // setVolume は RemoteAudioTrack にのみ存在するため型チェックを行う
      participant.audioTrackPublications.forEach(pub => {
        if (pub.audioTrack && 'setVolume' in pub.audioTrack) {
          (pub.audioTrack as { setVolume: (v: number) => void }).setVolume(val / 100)
        }
      })
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayName}
      </span>
      <span style={{ fontSize: '0.8rem' }}>{volume === 0 ? '🔇' : '🔊'}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={volume}
        onChange={e => handleVolumeChange(Number(e.target.value))}
        style={{ width: 90, accentColor: '#818cf8' }}
        title={`${displayName}の音量: ${volume}%`}
      />
      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: 32 }}>{volume}%</span>
    </div>
  )
}

// ─── リアルな効果音を再生するディスパッチャー ───
// /public/sounds 内に配置されたMP3ファイルを再生します
function dispatchSound(key: string) {
  if (typeof window === 'undefined') return

  const fileMap: Record<string, string> = {
    clap: '/sounds/clap.mp3',
    laugh: '/sounds/laugh.mp3',
    heart: '/sounds/heart.mp3',
    fire: '/sounds/fire.mp3',
    party: '/sounds/party.mp3',
    coin: '/sounds/coin.mp3',
  }

  const audioUrl = fileMap[key]
  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl)
      audio.volume = 0.6 // 音量調整
      audio.play().catch(() => {
        // ブラウザの自動再生ポリシーなどで弾かれた場合は無視
      })
    } catch { /* 無視 */ }
  }
}


// リアクションパネルコンポーネント
function ReactionPanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: 'calc(100% + 12px)',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#1e1e2e',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: '12px 16px',
      display: 'flex',
      gap: 8,
      boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
      animation: 'fadeUp 0.2s ease',
      zIndex: 100,
    }}>
      {REACTION_DEFS.map(r => (
        <button
          key={r.emoji}
          title={r.label}
          onClick={() => {
            dispatchSound(r.key)  // 専用音色を再生
            onClose()
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '8px 10px',
            fontSize: '1.3rem',
            cursor: 'pointer',
            transition: 'transform 0.15s, background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  )
}

export default function RoomPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div style={{ minHeight: '100vh', background: '#090b14' }} />
  return <RoomPageContent />
}

function RoomPageContent() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  // ─── 部屋情報を取得 ───────────────────────────────
  const room = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
      const found = stored.find(r => r.id === roomId)
      if (found) return found
    } catch { /* localStorage 利用不可 */ }
    return mockRooms.find(r => r.id === roomId) ?? mockRooms[0]
  })()

  const isNewRoom = !!(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
      return stored.find(r => r.id === roomId)
    } catch { return null }
  })()

  // ─── 自分の識別子（簡易UID）───────────────────────
  // 実際は Firebase Auth UID を使う。ここでは localStorage で永続化
  const myUid = (() => {
    if (typeof window === 'undefined') return 'uid_unknown'
    let uid = localStorage.getItem('ondabe_uid')
    if (!uid) { uid = `uid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; localStorage.setItem('ondabe_uid', uid) }
    return uid
  })()
  const isGuest = true
  const guestName = (typeof window !== 'undefined' ? localStorage.getItem('ondabe_name') : null) ?? `ゲスト${myUid.slice(-4)}`

  // 自分が部屋の作成者（ホスト）かどうか
  const amIHost = isNewRoom

  // ─── Firestore リアルタイム状態 ───────────────────
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [stateReady, setStateReady] = useState(false)

  // 自分のロール（roomState から抽出）
  const myRole: RoomMember['role'] = (() => {
    if (!roomState) return amIHost ? 'host' : 'listener'
    const m = roomState.members[myUid]
    return m?.role ?? (amIHost ? 'host' : 'listener')
  })()

  const amIModerator = myRole === 'host' || myRole === 'moderator'
  const amISpeaker = ['host', 'moderator', 'speaker'].includes(myRole)
  const myHandRaised = roomState?.raisedHandUids?.includes(myUid) ?? false

  // ─── ローカル UI 状態 ─────────────────────────────
  const [isMuted, setIsMuted] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'bgm'>('chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState(isNewRoom ? [] : MOCK_MESSAGES)
  const [showReactions, setShowReactions] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showRoomMenu, setShowRoomMenu] = useState(false)
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
  const [youtubeVolume, setYoutubeVolume] = useState(80)
  const [livekitToken, setLivekitToken] = useState<string | null>(null)

  const reactionBtnRef = useRef<HTMLDivElement>(null)
  const avatarBtnRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''

  // ─── Firestore 状態の初期化 & 購読 ────────────────
  useEffect(() => {
    let unsub: (() => void) | null = null

    const setup = async () => {
      if (amIHost) {
        // ホストは状態ドキュメントを作成
        await initRoomState(roomId, myUid, guestName).catch(() => { })
      } else {
        // リスナーとして参加登録
        await joinAsListener(roomId, myUid, guestName).catch(() => { })
      }

      // リアルタイム購読開始
      unsub = subscribeToRoomState(roomId, (state) => {
        setRoomState(state)
        setStateReady(true)
      })
    }

    setup()
    return () => { unsub?.() }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ルーム終了の監視
  useEffect(() => {
    if (stateReady && roomState === null) {
      if (!isNewRoom) { // モックルーム対応のためにisNewRoomを確認
        alert('ルームが終了しました。')
      }
      router.push('/')
    }
  }, [stateReady, roomState, router, isNewRoom])

  // ─── LiveKit トークン取得（自分のロールに応じて） ──
  useEffect(() => {
    if (!stateReady && !amIHost) return  // 状態確定まで待機
    const fetchToken = async () => {
      try {
        const role = amIHost ? 'host' : myRole
        const res = await fetch(
          `/api/livekit-token?room=${encodeURIComponent(room.livekitRoomName)}&username=${encodeURIComponent(myUid)}&role=${role}`
        )
        const data = await res.json()
        if (data.token) setLivekitToken(data.token)
      } catch (err) {
        console.error('LiveKit トークン取得失敗:', err)
      }
    }
    fetchToken()
  }, [stateReady, myRole]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── BroadcastChannel（YouTube 同期） ──────────────
  useEffect(() => {
    const ch = new BroadcastChannel(`ondabe-room-${roomId}`)
    channelRef.current = ch
    ch.onmessage = (e) => {
      if (e.data?.type === 'yt-sync') setYoutubeVideoId(e.data.videoId ?? null)
    }
    return () => ch.close()
  }, [roomId])

  const applyYoutubeVideoId = (videoId: string | null) => {
    setYoutubeVideoId(videoId)
    channelRef.current?.postMessage({ type: 'yt-sync', videoId })
  }

  const applyYoutubeUrl = (input: string) => {
    const match = input.match(/(?:youtu\.be\/|watch\?v=|embed\/|shorts\/|live\/)?([\w-]{11})/)
    const videoId = match ? match[1] : null
    applyYoutubeVideoId(videoId)
    setYoutubeInput('')
  }
  const sendYoutubeVolume = (vol: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }), '*'
    )
  }



  // ─── モデレーター操作 ────────────────────────────
  const handlePromote = useCallback(async (uid: string) => {
    await promoteToSpeaker(roomId, uid)
  }, [roomId])

  const handleDemote = useCallback(async (uid: string) => {
    await demoteToListener(roomId, uid)
  }, [roomId])

  const handleGrantMod = useCallback(async (uid: string) => {
    await grantModerator(roomId, uid)
  }, [roomId])

  const handleRevokeMod = useCallback(async (uid: string) => {
    if (!roomState) return
    await revokeModerator(roomId, uid, roomState.hostUid)
  }, [roomId, roomState])

  // ─── 手を挙げる / 下げる ─────────────────────────
  const handleHandRaise = useCallback(async () => {
    await setHandRaised(roomId, myUid, !myHandRaised)
  }, [roomId, myUid, myHandRaised])

  // ─── ミュート状態を Firestore にも反映 ────────────
  const handleToggleMute = useCallback(async () => {
    const next = !isMuted
    setIsMuted(next)
    await updateMuteState(roomId, myUid, next)
  }, [roomId, myUid, isMuted])

  // ─── チャット送信 ─────────────────────────────────
  const handleSendMessage = useCallback(() => {
    if (!chatMessage.trim()) return
    const userMsg = {
      id: `m${Date.now()}`,
      userId: myUid,
      userName: guestName,
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setChatMessage('')
  }, [chatMessage, guestName, myUid])

  // ─── 退出処理 ─────────────────────────────────────
  const handleLeave = useCallback(async () => {
    if (!window.confirm(isNewRoom ? '部屋から退出しますか？' : '部屋から退出しますか？')) return
    await leaveRoomState(roomId, myUid).catch(() => { })
    router.push('/')
  }, [isNewRoom, roomId, myUid, router])

  // ─── 部屋を終了する ───────────────────────────────
  const handleCloseRoom = useCallback(async () => {
    if (!window.confirm('本当にこのルームを終了しますか？ (参加者全員が切断されます)')) return
    await closeRoom(roomId).catch(() => { })
    if (isNewRoom) {
      try {
        const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
        localStorage.setItem('created_rooms', JSON.stringify(stored.filter(r => r.id !== roomId)))
      } catch { /* 無視 */ }
    }
    router.push('/')
  }, [isNewRoom, roomId, router])

  // ─── Firestore からスピーカー/リスナー一覧を構築 ──
  const speakerMembers: RoomMember[] = roomState
    ? (roomState.speakerUids ?? []).map(uid => roomState.members[uid]).filter(Boolean)
    : []
  const listenerMembers: RoomMember[] = roomState
    ? (roomState.listenerUids ?? []).map(uid => roomState.members[uid]).filter(Boolean)
    : []
  const raisedHandUids = roomState?.raisedHandUids ?? []

  const micLabel = isMuted ? 'ミュート中' : 'オン'

  // ─── 接続待ち表示 ────────────────────────────────
  if (!livekitToken) {
    return (
      <div className={styles.roomLayout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>⏳ 部屋に接続中...</p>
      </div>
    )
  }

  return (
    // LiveKitRoom：この中のコンポーネントが LiveKit サーバーに接続される
    <>
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={livekitToken}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={handleLeave}
      >
        <RoomAudioRenderer />
        <div className={styles.roomLayout}>
          {/* ゲストユーザー向けアップグレードバナー（匿名ユーザーのみ表示） */}
          {isGuest && <UpgradeBanner guestName={guestName} />}
          {/* ルームヘッダー */}
          <header className={styles.roomHeader}>
            <div className={styles.roomHeaderLeft}>
              <button
                onClick={handleLeave}
                className={styles.backBtn}
              >
                ← 戻る
              </button>
              <div className={styles.roomHeaderInfo}>
                <h1 className={styles.roomHeaderTitle}>
                  <span className="badge badge-live">LIVE</span>
                  {room.name}
                </h1>
                <div className={styles.roomHeaderMeta}>
                  {room.clubName && (
                    <span className={styles.roomHeaderClub}>🏛️ {room.clubName}</span>
                  )}
                  <span className={styles.roomHeaderCount}>
                    👥 {room.participantCount}人参加中
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.roomHeaderRight}>
              <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                onClick={() => {
                  // 現在のURLをクリップボードにコピー
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    alert('部屋のURLをコピーしました！')
                  })
                }}
              >
                🔗 シェア
              </button>
              {/* 三点リーダーメニュー */}
              <div style={{ position: 'relative' }}>
                <button
                  className="btn-ghost"
                  style={{ padding: '7px 14px', fontSize: '0.82rem' }}
                  onClick={() => setShowRoomMenu(prev => !prev)}
                  id="room-menu-btn"
                >
                  ⋯
                </button>
                {showRoomMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: '#1e1e2e',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, padding: 8,
                    minWidth: 180,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    zIndex: 300,
                    animation: 'fadeUp 0.15s ease',
                  }}>
                    {[
                      { icon: '👥', label: '参加者を見る', action: () => { setActiveTab('participants'); setDrawerOpen(true); setShowRoomMenu(false) } },
                      { icon: '🎵', label: 'BGMを操作', action: () => { setActiveTab('bgm'); setDrawerOpen(true); setShowRoomMenu(false) } },
                      { icon: '🔗', label: 'URLをコピー', action: () => { navigator.clipboard.writeText(window.location.href); setShowRoomMenu(false) } },
                      { icon: '🚪', label: '退出する', action: () => { handleLeave(); setShowRoomMenu(false) } },
                      ...(amIModerator ? [{ icon: '🛑', label: 'ルームを終了', action: () => { handleCloseRoom(); setShowRoomMenu(false) }, danger: true }] : []),
                    ].map(item => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '9px 12px',
                          background: 'transparent',
                          border: 'none', borderRadius: 8,
                          color: item.danger ? '#f87171' : 'var(--text-primary)',
                          fontSize: '0.83rem', cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* メインコンテンツ */}
          <div className={styles.roomContent}>
            {/* 空間レイアウトエリア */}
            <div className={styles.spatialArea}>
              {/* YouTube プレイヤー */}
              <div className={styles.youtubeArea}>
                <div
                  className={styles.zoneTitleRow}
                  style={{ cursor: 'pointer', marginBottom: youtubeVideoId ? 16 : 0, borderBottom: youtubeVideoId ? '1px solid var(--border-color)' : 'none', paddingBottom: youtubeVideoId ? 12 : 0 }}
                  onClick={() => {
                    if (!youtubeVideoId) {
                      const url = prompt('YouTube URLを入力してください:')
                      if (url) applyYoutubeUrl(url)
                    }
                  }}
                >
                  <span className={styles.zoneTitle}>📺 YouTube BGM</span>
                  {!youtubeVideoId && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 8 }}>（タップしてURLを入力）</span>
                  )}
                  {youtubeVideoId && (
                    <button
                      className={styles.youtubeClearBtn}
                      style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24 }}
                      onClick={(e) => { e.stopPropagation(); applyYoutubeVideoId(null) }}
                    >✕</button>
                  )}
                </div>

                {youtubeVideoId && (
                  <>
                    <div className={styles.youtubePlayerWrap}>
                      <iframe
                        ref={iframeRef}
                        src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="YouTube 動画プレイヤー"
                      />
                    </div>
                    {/* 音量コントロール */}
                    <div className={styles.youtubeVolumeRow} style={{ marginTop: 8 }}>
                      <button
                        className={styles.youtubeVolumeBtn}
                        onClick={() => { const v = youtubeVolume === 0 ? 80 : 0; setYoutubeVolume(v); sendYoutubeVolume(v) }}
                      >
                        {youtubeVolume === 0 ? '🔇' : youtubeVolume < 50 ? '🔉' : '🔊'}
                      </button>
                      <input
                        type="range" min={0} max={100} value={youtubeVolume}
                        onChange={e => { const v = Number(e.target.value); setYoutubeVolume(v); sendYoutubeVolume(v) }}
                        style={{ flex: 1, accentColor: '#818cf8', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>{youtubeVolume}%</span>
                    </div>
                  </>
                )}
              </div>

              {/* ─── スピーカーゾーン ─── */}
              <section className={styles.speakersSection}>
                <div className={styles.zoneTitleRow}>
                  <span className={styles.zoneTitle}>🎙️ スピーカー</span>
                  <span className={styles.zoneCount}>{speakerMembers.length}</span>
                </div>
                <div className={styles.speakerGrid}>
                  {speakerMembers.map((member) => (
                    <SpeakerBubble
                      key={member.uid}
                      participant={{
                        userId: member.uid,
                        username: member.uid,
                        displayName: member.displayName,
                        avatarUrl: null,
                        role: member.role === 'host' ? 'host' : 'speaker',
                        isMuted: member.isMuted,
                        isSpeaking: false,
                        handRaised: false,
                      }}
                      isMe={member.uid === myUid}
                      avatarUrl={member.uid === myUid ? userAvatar : null}
                      isModerator={amIModerator}
                      isHost={member.role === 'host'}
                      memberRole={member.role}
                      onDemote={() => handleDemote(member.uid)}
                      onGrantMod={() => handleGrantMod(member.uid)}
                      onRevokeMod={() => handleRevokeMod(member.uid)}
                    />
                  ))}
                </div>
              </section>

              {/* ─── 手挙げ通知（モデレーター向け） ─── */}
              {amIModerator && raisedHandUids.length > 0 && (
                <section className={styles.raisedHandsSection}>
                  <div className={styles.zoneTitleRow}>
                    <span className={styles.zoneTitle}>✋ 発言リクエスト</span>
                    <span className={styles.zoneCount}>{raisedHandUids.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {raisedHandUids.map(uid => {
                      const m = roomState?.members[uid]
                      if (!m) return null
                      return (
                        <div key={uid} className={styles.handRaiseRow}>
                          <span className={styles.handRaiseName}>✋ {m.displayName}</span>
                          <button
                            className={styles.promoteBtn}
                            onClick={() => handlePromote(uid)}
                          >
                            ステージへ ↑
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ─── リスナーゾーン ─── */}
              <section className={styles.listenersSection}>
                <div className={styles.zoneTitleRow}>
                  <span className={styles.zoneTitle}>🎧 リスナー</span>
                  <span className={styles.zoneCount}>{listenerMembers.length}</span>
                </div>
                <div className={styles.listenerGrid}>
                  {listenerMembers.slice(0, 30).map((member) => (
                    <div key={member.uid} style={{ position: 'relative' }}>
                      <ListenerBubble
                        participant={{
                          userId: member.uid,
                          username: member.uid,
                          displayName: member.displayName,
                          avatarUrl: null,
                          role: 'speaker',
                          isMuted: true,
                          isSpeaking: false,
                          handRaised: raisedHandUids.includes(member.uid),
                        }}
                        isMe={member.uid === myUid}
                        avatarUrl={member.uid === myUid ? userAvatar : null}
                      />
                      {/* モデレーターがリスナーをステージへ上げるボタン */}
                      {amIModerator && member.uid !== myUid && (
                        <button
                          className={styles.promoteSmallBtn}
                          onClick={() => handlePromote(member.uid)}
                          title="ステージへ上げる"
                        >↑</button>
                      )}
                    </div>
                  ))}
                  {listenerMembers.length > 30 && (
                    <div className={styles.moreListeners}>+{listenerMembers.length - 30}</div>
                  )}
                </div>
              </section>
            </div>

            {/* モバイル専用：右下フローティングボタン（ドロワーを開く） */}
            <button
              className={styles.floatingPanelBtn}
              onClick={() => setDrawerOpen(true)}
              title="チャット・YouTube・参加者を開く"
              aria-label="パネルを開く"
            >
              {activeTab === 'participants' ? '👥' : activeTab === 'bgm' ? '🎵' : '💬'}
            </button>

            {/* モバイル用ドロワーオーバーレイ（背景タップで閉じる） */}
            {drawerOpen && (
              <div
                className={styles.drawerOverlay}
                onClick={() => setDrawerOpen(false)}
              />
            )}

            {/* サイドパネル（デスクトップ：右固定 / モバイル：下からドロワー） */}
            <aside className={`${styles.sidePanel} ${drawerOpen ? styles.drawerOpen : ''}`}>
              <div className={styles.sidePanelTabs}>
                <button
                  className={`${styles.sidePanelTab} ${activeTab === 'chat' ? styles.active : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  💬 チャット
                </button>
                <button
                  className={`${styles.sidePanelTab} ${activeTab === 'participants' ? styles.active : ''}`}
                  onClick={() => setActiveTab('participants')}
                >
                  👥 参加者
                </button>
                <button
                  className={`${styles.sidePanelTab} ${activeTab === 'bgm' ? styles.active : ''}`}
                  onClick={() => setActiveTab('bgm')}
                >
                  🎵 BGM
                </button>
              </div>

              <div className={styles.sidePanelContent}>
                {/* チャットタブ */}
                {activeTab === 'chat' && (
                  <div>
                    {messages.map((msg) => (
                      <div key={msg.id} className={styles.chatMessage}>
                        <div className={styles.chatMessageHeader}>
                          <span className={styles.chatUserName}>{msg.userName}</span>
                          <span className={styles.chatTime}>{msg.time}</span>
                        </div>
                        <p className={styles.chatMessageText}>{msg.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* BGMタブ — 常駐させて非表示にすることで再生を止めない */}
                <div style={{ display: activeTab === 'bgm' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                  <BGMPlayer />
                </div>

                {/* 参加者タブ — 音量スライダー付き */}
                {activeTab === 'participants' && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      スピーカー ({room.speakers.length})
                    </p>
                    {room.speakers.map(s => (
                      <div key={s.userId} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                        {/* 参加者情報 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 6 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {getInitials(s.displayName)}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.displayName}</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {s.role === 'host' ? '👑 ホスト' : '🎙️ スピーカー'}{s.isSpeaking ? ' · 発話中...' : ''}
                            </p>
                          </div>
                          <span style={{ fontSize: '0.9rem' }}>{s.isMuted ? '🔇' : '🎙️'}</span>
                        </div>
                        {/* 音量スライダー（自分以外のみ表示） */}
                        {s.userId !== 'user_current' && (
                          <RemoteVolumeControl
                            participantIdentity={s.userId}
                            displayName={s.displayName}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* チャット入力エリア */}
              {activeTab === 'chat' && (
                <div className={styles.chatInputArea}>
                  <textarea
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="メッセージを入力... (Enter で送信)"
                    className={styles.chatInput}
                    rows={2}
                  />
                </div>
              )}
            </aside>
          </div>

          {/* コントロールバー（下部） */}
          <footer className={styles.controlBar}>

            {/* マイクボタン（スピーカーのみ有効） */}
            {amISpeaker ? (
              <MicrophoneSelector>
                <button
                  id="mute-toggle-btn"
                  className={`${styles.controlBtn} ${styles.muteBtn} ${isMuted ? styles.muted : styles.unmuted}`}
                  onClick={handleToggleMute}
                  style={{ borderRadius: '8px 0 0 8px' }}
                >
                  <MicControl isMuted={isMuted} onToggle={handleToggleMute} />
                  <span className={styles.controlBtnLabel}>{micLabel}</span>
                </button>
              </MicrophoneSelector>
            ) : (
              /* リスナーには聴いているだけバッジ */
              <div className={styles.listenerBadge}>
                <span>🎧</span>
                <span className={styles.controlBtnLabel}>聴いています</span>
              </div>
            )}

            {/* 手を挙げる（リスナーのみ） */}
            {!amISpeaker && (
              <button
                id="hand-raise-btn"
                className={`${styles.controlBtn} ${myHandRaised ? styles.active : ''}`}
                onClick={handleHandRaise}
              >
                <span className={styles.controlBtnIcon}>✋</span>
                <span className={styles.controlBtnLabel}>{myHandRaised ? '手を下げる' : '発言リクエスト'}</span>
              </button>
            )}

            {/* リアクションボタン */}
            <div ref={reactionBtnRef} style={{ position: 'relative' }}>
              {showReactions && <ReactionPanel onClose={() => setShowReactions(false)} />}
              <button
                id="reaction-btn"
                className={styles.controlBtn}
                onClick={() => setShowReactions(prev => !prev)}
              >
                <span className={styles.controlBtnIcon}>😊</span>
                <span className={styles.controlBtnLabel}>リアクション</span>
              </button>
            </div>

            {/* アバター変更ボタン（画像アップロード対応） */}
            <div ref={avatarBtnRef} style={{ position: 'relative' }}>
              {/* 非表示のファイル入力 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = ev => {
                    if (ev.target?.result) {
                      setUserAvatar(ev.target.result as string)
                      setShowAvatarPicker(false)
                    }
                  }
                  reader.readAsDataURL(file)
                }}
              />
              {/* アバタープレビューポップアップ */}
              {showAvatarPicker && (
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 12px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#1e1e2e',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 16,
                  padding: '16px',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  minWidth: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  alignItems: 'center',
                }}>
                  {/* 現在のアバタープレビュー */}
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: userAvatar ? 'transparent' : 'var(--accent-gradient)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #6366f1',
                    flexShrink: 0,
                  }}>
                    {userAvatar ? (
                      <img src={userAvatar} alt="現在のアイコン" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white' }}>?</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                    画像をアップロードしてアイコンに設定
                  </p>
                  {/* アップロードボタン */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none',
                      borderRadius: 10,
                      padding: '9px 18px',
                      color: 'white',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    📁 画像を選択する
                  </button>
                  {/* リセットボタン */}
                  {userAvatar && (
                    <button
                      onClick={() => { setUserAvatar(null); setShowAvatarPicker(false) }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        width: '100%',
                      }}
                    >
                      ✕ デフォルトに戻す
                    </button>
                  )}
                </div>
              )}
              <button
                id="avatar-btn"
                className={styles.controlBtn}
                onClick={() => setShowAvatarPicker(prev => !prev)}
                title="アイコン画像を変更"
              >
                {/* アバタープレビュー（サムネイル） */}
                <span className={styles.controlBtnIcon} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  overflow: 'hidden', display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: userAvatar ? 'transparent' : 'var(--accent-gradient)',
                  flexShrink: 0,
                }}>
                  {userAvatar ? (
                    <img src={userAvatar} alt="アイコン" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '🙂'
                  )}
                </span>
                <span className={styles.controlBtnLabel}>アイコン</span>
              </button>
            </div>

            {/* 💬 チャット（モバイルドロワーを開く） */}
            <button
              id="chat-toggle-btn"
              className={styles.controlBtn}
              onClick={() => { setActiveTab('chat'); setDrawerOpen(prev => !prev) }}
            >
              <span className={styles.controlBtnIcon}>💬</span>
              <span className={styles.controlBtnLabel}>チャット</span>
            </button>

            {/* 🔗 招待 */}
            <button id="invite-btn" className={styles.controlBtn}
              onClick={() => navigator.clipboard.writeText(window.location.href).then(() => alert('部屋のURLをコピーしました！'))}
            >
              <span className={styles.controlBtnIcon}>🔗</span>
              <span className={styles.controlBtnLabel}>招待</span>
            </button>

            {/* 退出ボタン */}
            <button
              id="leave-room-btn"
              className={styles.leaveBtn}
              onClick={handleLeave}
            >
              🚪 退出する
            </button>
          </footer>
        </div>
      </LiveKitRoom>
    </>
  )
}
