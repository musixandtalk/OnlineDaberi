'use client'
// オンダベ — 音声部屋ページ・空間レイアウト
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { mockRooms } from '@/lib/mockData'
import type { RoomParticipant } from '@/types'
import BGMPlayer from '@/components/BGMPlayer/BGMPlayer'
import UpgradeBanner from '@/components/UpgradeBanner/UpgradeBanner'
import styles from './room.module.css'

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
function SpeakerBubble({ participant }: { participant: RoomParticipant }) {
  return (
    <div className={styles.participantBubble}>
      <div className={`${styles.bubbleAvatar} ${participant.isSpeaking ? styles.speaking : ''}`}>
        {getInitials(participant.displayName)}
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
      <span className={styles.bubbleName}>{participant.displayName}</span>
      <span className={styles.bubbleRole}>
        {participant.role === 'host' ? 'ホスト' : 'スピーカー'}
      </span>
    </div>
  )
}

// リスナーバブルコンポーネント
function ListenerBubble({ participant }: { participant: RoomParticipant }) {
  return (
    <div className={styles.listenerBubble}>
      <div className={styles.listenerAvatar}>
        {getInitials(participant.displayName)}
        {participant.handRaised && (
          <span className={styles.handRaisedBadge}>✋</span>
        )}
      </div>
      <span className={styles.listenerName}>{participant.displayName}</span>
    </div>
  )
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string

  // モックデータから部屋を取得
  const room = mockRooms.find(r => r.id === roomId) ?? mockRooms[0]

  // ローカル状態
  const [isMuted, setIsMuted] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants' | 'bgm'>('chat')
  const [chatMessage, setChatMessage] = useState('')
  const [messages, setMessages] = useState(MOCK_MESSAGES)

  // デモ用：匿名ユーザーとして表示（実際はFirebase Authで判定）
  const isGuest = true
  const guestName = 'ゲスト4829'

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

  // チャット送信
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return
    const newMsg = {
      id: `m${Date.now()}`,
      userId: 'user_current',
      userName: 'Hiroki',
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
    }
    setMessages(prev => [...prev, newMsg])
    setChatMessage('')
  }

  // 退出処理
  const handleLeave = () => {
    router.push('/')
  }

  // リスナー表示数の上限
  const displayListeners = room.listeners.slice(0, 30)
  const remainingListeners = room.listeners.length - 30

  return (
    <div className={styles.roomLayout}>
      {/* ゲストユーザー向けアップグレードバナー（匿名ユーザーのみ表示） */}
      {isGuest && <UpgradeBanner guestName={guestName} />}
      {/* ルームヘッダー */}
      <header className={styles.roomHeader}>
        <div className={styles.roomHeaderLeft}>
          <Link href="/" className={styles.backBtn}>← 戻る</Link>
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
          <button className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
            🔗 シェア
          </button>
          <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: '0.82rem' }}>
            ⋯
          </button>
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
                <ListenerBubble key={listener.userId} participant={listener} />
              ))}
              {remainingListeners > 0 && (
                <div className={styles.moreListeners}>
                  +{remainingListeners}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* サイドパネル（チャット/参加者リスト） */}
        <aside className={styles.sidePanel}>
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
            ) : activeTab === 'bgm' ? (
              /* BGMタブ — ルーム内専用 */
              <BGMPlayer />
            ) : (
              /* 参加者タブ */
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  スピーカー ({room.speakers.length})
                </p>
                {room.speakers.map(s => (
                  <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
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
        {/* ミュートボタン */}
        <button
          id="mute-toggle-btn"
          className={`${styles.controlBtn} ${styles.muteBtn} ${isMuted ? styles.muted : styles.unmuted}`}
          onClick={() => setIsMuted(!isMuted)}
        >
          <span className={styles.controlBtnIcon}>{isMuted ? '🔇' : '🎙️'}</span>
          <span className={styles.controlBtnLabel}>{isMuted ? 'ミュート中' : 'オン'}</span>
        </button>

        {/* 手を挙げる */}
        <button
          id="hand-raise-btn"
          className={`${styles.controlBtn} ${handRaised ? styles.active : ''}`}
          onClick={() => setHandRaised(!handRaised)}
        >
          <span className={styles.controlBtnIcon}>✋</span>
          <span className={styles.controlBtnLabel}>{handRaised ? '手を下げる' : '手を挙げる'}</span>
        </button>

        {/* 招待 */}
        <button id="invite-btn" className={styles.controlBtn}>
          <span className={styles.controlBtnIcon}>🔗</span>
          <span className={styles.controlBtnLabel}>招待</span>
        </button>

        {/* チャット（モバイル） */}
        <button id="chat-toggle-btn" className={styles.controlBtn}>
          <span className={styles.controlBtnIcon}>💬</span>
          <span className={styles.controlBtnLabel}>チャット</span>
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
  )
}
