'use client'
// オンダベ — 音声部屋ページ（LiveKit 音声通話・マイク選択・音量制御・リアクション対応）
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LiveKitRoom,
  useLocalParticipant,
  useConnectionState,
  useRemoteParticipants,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { ConnectionState } from 'livekit-client'
import { mockRooms } from '@/lib/mockData'
import type { Room, RoomParticipant } from '@/types'
import BGMPlayer from '@/components/BGMPlayer/BGMPlayer'
import UpgradeBanner from '@/components/UpgradeBanner/UpgradeBanner'
import MicrophoneSelector from '@/components/MicrophoneSelector/MicrophoneSelector'
import styles from './room.module.css'

// リアクション定義（絵文字・ラベル・効果音の周波数）
const REACTIONS = [
  { emoji: '👏', label: '拍手', freq: 880, duration: 0.3 },
  { emoji: '😂', label: '笑い', freq: 440, duration: 0.2 },
  { emoji: '❤️', label: 'ハート', freq: 660, duration: 0.25 },
  { emoji: '🔥', label: 'Fire', freq: 330, duration: 0.4 },
  { emoji: '🎉', label: '祝', freq: 1046, duration: 0.3 },
  { emoji: '💯', label: '最高', freq: 523, duration: 0.2 },
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

// 参加者バブルコンポーネント（スピーカー用）
function SpeakerBubble({
  participant,
  isMe = false,
  avatarUrl,
}: {
  participant: RoomParticipant
  isMe?: boolean
  avatarUrl?: string | null
}) {
  return (
    <div className={styles.participantBubble} style={{ position: 'relative' }}>
      {/* 「あなた」バッジ */}
      {isMe && (
        <span style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          fontSize: '0.6rem',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: 20,
          whiteSpace: 'nowrap',
          zIndex: 2,
          letterSpacing: '0.04em',
        }}>
          ★ あなた
        </span>
      )}
      <div
        className={`${styles.bubbleAvatar} ${participant.isSpeaking ? styles.speaking : ''}`}
        style={isMe ? {
          outline: '3px solid #6366f1',
          outlineOffset: 2,
          overflow: 'hidden',
          padding: 0,
        } : undefined}
      >
        {/* アバター画像（アップロード済みの場合）*/}
        {isMe && avatarUrl ? (
          <img
            src={avatarUrl}
            alt="自分のアイコン"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          />
        ) : (
          getInitials(participant.displayName)
        )}
        {/* ホストアイコン */}
        {participant.role === 'host' && (
          <span className={styles.hostCrown}>👑</span>
        )}
        {/* マイクステータス */}
        <span className={`${styles.micStatus} ${participant.isMuted ? styles.muted : styles.active}`}>
          {participant.isMuted ? '🔇' : '🎙️'}
        </span>
        {/* 手を挙げているサイン */}
        {participant.handRaised && (
          <span className={styles.handRaisedBadge}>✋</span>
        )}
      </div>
      <span className={styles.bubbleName}>
        {isMe ? 'あなた' : participant.displayName}
      </span>
      <span className={styles.bubbleRole}>
        {participant.role === 'host' ? 'ホスト' : 'スピーカー'}
      </span>
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

// Web Audio API を使ったリアクション効果音を再生する関数
function playReactionSound(freq: number, duration: number) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
    oscillator.type = 'sine'

    // フェードアウトして自然な音に
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch {
    // AudioContext が使えない環境では無視
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
      {REACTIONS.map(r => (
        <button
          key={r.emoji}
          title={r.label}
          onClick={() => {
            playReactionSound(r.freq, r.duration)
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
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  // localStorage（新規作成部屋）→ mockRooms の順で部屋を取得
  const room = (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
      const found = stored.find(r => r.id === roomId)
      if (found) return found
    } catch { /* localStorage 利用不可 */ }
    return mockRooms.find(r => r.id === roomId) ?? mockRooms[0]
  })()

  // 新規作成部屋（localStorage にある）かどうかを判定
  const isNewRoom = !!(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
      return stored.find(r => r.id === roomId)
    } catch { return null }
  })()

  // ローカル状態（新規部屋は YouTube タブをデフォルト表示）
  const [isMuted, setIsMuted] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'bgm' | 'youtube'>(isNewRoom ? 'youtube' : 'chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState(isNewRoom ? [] : MOCK_MESSAGES)
  const [showReactions, setShowReactions] = useState(false)
  const reactionBtnRef = useRef<HTMLDivElement>(null)
  // モバイル用ドロワー（サイドパネル）の開閉
  const [drawerOpen, setDrawerOpen] = useState(false)
  // 三点リーダーメニューの開閉
  const [showRoomMenu, setShowRoomMenu] = useState(false)

  // アバター画像（変更可能）——画像アップロード対応
  const [userAvatar, setUserAvatar] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const avatarBtnRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // YouTube 埋め込み状態
  const [youtubeInput, setYoutubeInput] = useState('')
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
  const [youtubeVolume, setYoutubeVolume] = useState(80) // 0～100
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // iframeに対して音量を送信（YouTube IFrame API の postMessageを利用）
  const sendYoutubeVolume = (vol: number) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [vol] }),
      '*'
    )
  }

  // LiveKit トークンの状態
  const [livekitToken, setLivekitToken] = useState<string | null>(null)
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''

  // デモ用：匿名ユーザーとして表示
  const isGuest = true
  const guestName = 'ゲスト4829'

  // 部屋に入る際にトークンを取得
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const username = encodeURIComponent(guestName)
        const roomName = encodeURIComponent(room.livekitRoomName)
        const res = await fetch(`/api/livekit-token?room=${roomName}&username=${username}`)
        const data = await res.json()
        if (data.token) setLivekitToken(data.token)
      } catch (err) {
        console.error('LiveKit トークンの取得に失敗しました:', err)
      }
    }
    fetchToken()
  }, [room.livekitRoomName, guestName])

  // 発話シミュレーション（デモ用）
  const [speakingUserId, setSpeakingUserId] = useState<string | null>('u1')
  useEffect(() => {
    const speakers = room.speakers.filter(s => !s.isMuted)
    if (speakers.length === 0) return
    const interval = setInterval(() => {
      const randomSpeaker = speakers[Math.floor(Math.random() * speakers.length)]
      setSpeakingUserId(randomSpeaker.userId)
    }, 3000)
    return () => clearInterval(interval)
  }, [room.speakers])

  // チャット送信（Bot なし、シンプルバージョン）
  const handleSendMessage = useCallback(() => {
    if (!chatMessage.trim()) return
    const userMsg = {
      id: `m${Date.now()}`,
      userId: 'user_current',
      userName: guestName,
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, userMsg])
    setChatMessage('')
  }, [chatMessage, guestName])

  // 退出処理（新規部屋の場合は確認ダイアログを表示）
  const handleLeave = () => {
    const confirmMsg = isNewRoom
      ? '部屋から退出するとこの部屋は閉じられます。本当に退出しますか？'
      : '部屋から退出しますか？'
    if (!window.confirm(confirmMsg)) return
    // localStorage からこの部屋を削除
    if (isNewRoom) {
      try {
        const stored = JSON.parse(localStorage.getItem('created_rooms') ?? '[]') as Room[]
        localStorage.setItem('created_rooms', JSON.stringify(stored.filter(r => r.id !== roomId)))
      } catch { /* 無視 */ }
    }
    router.push('/')
  }

  // リスナー表示数の上限
  const displayListeners = room.listeners.slice(0, 30)
  const remainingListeners = room.listeners.length - 30

  // LiveKit に接続中かどうかの表示ラベル
  const micLabel = isMuted ? 'ミュート中' : 'オン'

  // LiveKit に接続できていない場合は読み込み中を表示
  if (!livekitToken) {
    return (
      <div className={styles.roomLayout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>⏳ 部屋に接続中...</p>
      </div>
    )
  }

  return (
    // LiveKitRoom：この中のコンポーネントが LiveKit サーバーに接続される
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={livekitToken}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={handleLeave}
    >
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
                    { icon: '📺', label: 'YouTubeを埋める', action: () => { setActiveTab('youtube'); setDrawerOpen(true); setShowRoomMenu(false) } },
                    { icon: '🔗', label: 'URLをコピー', action: () => { navigator.clipboard.writeText(window.location.href); setShowRoomMenu(false) } },
                    { icon: '🚪', label: '退出する', action: () => { handleLeave(); setShowRoomMenu(false) }, danger: true },
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
            {/* スピーカーゾーン */}
            <section className={styles.speakersSection}>
              <div className={styles.zoneTitleRow}>
                <span className={styles.zoneTitle}>🎙️ スピーカー</span>
                <span className={styles.zoneCount}>{room.speakers.length}</span>
              </div>
              <div className={styles.speakerGrid}>
                {room.speakers.map((speaker) => (
                  <SpeakerBubble
                    key={speaker.userId}
                    participant={{
                      ...speaker,
                      isSpeaking: speaker.userId === speakingUserId && !speaker.isMuted,
                    }}
                    isMe={speaker.userId === 'user_current'}
                    avatarUrl={speaker.userId === 'user_current' ? userAvatar : null}
                  />
                ))}
              </div>
            </section>

            {/* リスナーゾーン */}
            <section className={styles.listenersSection}>
              <div className={styles.zoneTitleRow}>
                <span className={styles.zoneTitle}>🎧 リスナー</span>
                <span className={styles.zoneCount}>{room.listeners.length}</span>
              </div>
              <div className={styles.listenerGrid}>
                {displayListeners.map((listener) => (
                  <ListenerBubble
                    key={listener.userId}
                    participant={listener}
                    isMe={listener.userId === 'user_current'}
                    avatarUrl={listener.userId === 'user_current' ? userAvatar : null}
                  />
                ))}
                {remainingListeners > 0 && (
                  <div className={styles.moreListeners}>
                    +{remainingListeners}
                  </div>
                )}
              </div>
            </section>
          </div>

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
              <button
                className={`${styles.sidePanelTab} ${activeTab === 'youtube' ? styles.active : ''}`}
                onClick={() => setActiveTab('youtube')}
              >
                📺 YouTube
              </button>
            </div>

            <div className={styles.sidePanelContent}>
              {activeTab === 'chat' ? (
                /* チャットタブ */
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
              ) : activeTab === 'youtube' ? (
                /* YouTube 埋め込みタブ */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    YouTube の URL または動画 ID を入力してください
                  </p>
                  {/* URL 入力フォーム */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      value={youtubeInput}
                      onChange={e => setYoutubeInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 8,
                        padding: '7px 10px',
                        color: 'var(--text-primary)',
                        fontSize: '0.78rem',
                        outline: 'none',
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          // URL から動画 ID を抽出
                          const match = youtubeInput.match(
                            /(?:youtu\.be\/|watch\?v=|embed\/)([\w-]{11})/
                          )
                          const videoId = match ? match[1] : youtubeInput.trim()
                          setYoutubeVideoId(videoId.length === 11 ? videoId : null)
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const match = youtubeInput.match(
                          /(?:youtu\.be\/|watch\?v=|embed\/)([\w-]{11})/
                        )
                        const videoId = match ? match[1] : youtubeInput.trim()
                        setYoutubeVideoId(videoId.length === 11 ? videoId : null)
                      }}
                      style={{
                        background: 'var(--accent-gradient)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '7px 12px',
                        color: 'white',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      ▶ 再生
                    </button>
                  </div>
                  {/* YouTube プレイヤー */}
                  {youtubeVideoId ? (
                    <>
                      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden' }}>
                        <iframe
                          ref={iframeRef}
                          src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&enablejsapi=1`}
                          style={{
                            position: 'absolute',
                            top: 0, left: 0,
                            width: '100%', height: '100%',
                            border: 'none',
                          }}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title="YouTube 動画プレイヤー"
                        />
                      </div>

                      {/* 音量スライダー */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <button
                          onClick={() => {
                            const newVol = youtubeVolume === 0 ? 80 : 0
                            setYoutubeVolume(newVol)
                            sendYoutubeVolume(newVol)
                          }}
                          style={{
                            background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: '1.1rem',
                            flexShrink: 0, lineHeight: 1,
                          }}
                          title={youtubeVolume === 0 ? 'ミュート解除' : 'ミュート'}
                        >
                          {youtubeVolume === 0 ? '🔇' : youtubeVolume < 50 ? '🔉' : '🔊'}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={youtubeVolume}
                          onChange={e => {
                            const vol = Number(e.target.value)
                            setYoutubeVolume(vol)
                            sendYoutubeVolume(vol)
                          }}
                          style={{ flex: 1, accentColor: '#818cf8', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>
                          {youtubeVolume}%
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      height: 150, background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10, border: '1px dashed rgba(255,255,255,0.1)',
                      color: 'var(--text-muted)', fontSize: '0.82rem', flexDirection: 'column', gap: 8
                    }}>
                      <span style={{ fontSize: '2rem' }}>📺</span>
                      <span>URL を入力して Enter を押してください</span>
                    </div>
                  )}
                  {/* クリアボタン */}
                  {youtubeVideoId && (
                    <button
                      onClick={() => { setYoutubeVideoId(null); setYoutubeInput('') }}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        padding: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      ✕ 動画をクリア
                    </button>
                  )}
                </div>
              ) : activeTab === 'bgm' ? (
                /* BGMタブ — ルーム内専用 */
                <BGMPlayer />
              ) : (
                /* 参加者タブ — 音量スライダー付き */
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

          {/* マイクボタン ＋ デバイス選択（MicrophoneSelector でラップ） */}
          <MicrophoneSelector>
            <button
              id="mute-toggle-btn"
              className={`${styles.controlBtn} ${styles.muteBtn} ${isMuted ? styles.muted : styles.unmuted}`}
              onClick={() => setIsMuted(!isMuted)}
              style={{ borderRadius: '8px 0 0 8px' }}
            >
              <MicControl isMuted={isMuted} onToggle={() => setIsMuted(!isMuted)} />
              <span className={styles.controlBtnLabel}>{micLabel}</span>
            </button>
          </MicrophoneSelector>

          {/* 手を挙げる */}
          <button
            id="hand-raise-btn"
            className={`${styles.controlBtn} ${handRaised ? styles.active : ''}`}
            onClick={() => setHandRaised(!handRaised)}
          >
            <span className={styles.controlBtnIcon}>✋</span>
            <span className={styles.controlBtnLabel}>{handRaised ? '手を下げる' : '手を挙げる'}</span>
          </button>

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
  )
}
