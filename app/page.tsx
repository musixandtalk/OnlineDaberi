'use client'
// ホームページ — オンダベ（OnlineDaberi）シンプル版
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import RoomCard from '@/components/RoomCard/RoomCard'
import { mockRooms } from '@/lib/mockData'
import type { Room } from '@/types'
import styles from './page.module.css'

export default function HomePage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [rooms, setRooms] = useState<Room[]>(mockRooms)
  const [showModal, setShowModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // 検索フィルター
  const filteredRooms = rooms.filter(room => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      room.name.toLowerCase().includes(q) ||
      room.description?.toLowerCase().includes(q) ||
      room.hostName.toLowerCase().includes(q) ||
      room.tags.some(t => t.toLowerCase().includes(q))
    )
  })

  // 部屋を作成してルームページへ遷移
  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return
    const roomId = `room_${Date.now()}`
    const newRoom: Room = {
      id: roomId,
      name: newRoomName.trim(),
      description: newRoomDesc.trim(),
      hostId: 'user_current',
      hostName: 'ゲストさん',
      hostAvatar: null,
      clubId: null,
      clubName: null,
      isPublic,
      tags: [],
      participantCount: 1,
      speakers: [
        { userId: 'user_current', username: 'guest', displayName: 'ゲストさん', avatarUrl: null, role: 'host', isMuted: true, isSpeaking: false, handRaised: false },
      ],
      listeners: [],
      livekitRoomName: roomId,
      createdAt: new Date(),
    }
    try {
      const existing = JSON.parse(localStorage.getItem('created_rooms') ?? '[]')
      localStorage.setItem('created_rooms', JSON.stringify([newRoom, ...existing]))
    } catch { /* 無視 */ }

    setRooms(prev => [newRoom, ...prev])
    setShowModal(false)
    setNewRoomName('')
    setNewRoomDesc('')
    router.push(`/room/${roomId}`)
  }

  return (
    <div className={styles.layout}>
      {/* サイドバー（モバイルではドロワー） */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ─── 部屋作成モーダル ─── */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🎙️ 新しい部屋を作る</h2>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* 部屋名 */}
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>部屋名 <span className={styles.required}>*</span></label>
              <input
                className={styles.modalInput}
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateRoom() }}
                placeholder="例：今夜のAIニュースを語ろう 🤖"
                maxLength={60}
                autoFocus
              />
              <span className={styles.charCount}>{newRoomName.length}/60</span>
            </div>

            {/* 説明 */}
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>説明（任意）</label>
              <textarea
                className={styles.modalInput}
                value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)}
                placeholder="どんな話をする部屋ですか？"
                rows={3}
                maxLength={200}
              />
            </div>

            {/* 公開設定 */}
            <div className={styles.modalToggleRow}>
              <button
                className={`${styles.toggle} ${isPublic ? styles.toggleOn : ''}`}
                onClick={() => setIsPublic(!isPublic)}
                type="button"
              >
                <span className={styles.toggleThumb} />
              </button>
              <span className={styles.modalLabel}>
                {isPublic ? '🌐 公開部屋（誰でも参加可）' : '🔒 非公開部屋（招待制）'}
              </span>
            </div>

            {/* 作成ボタン */}
            <button
              className={`${styles.createBtn} ${!newRoomName.trim() ? styles.createBtnDisabled : ''}`}
              onClick={handleCreateRoom}
              disabled={!newRoomName.trim()}
            >
              🎙️ 部屋を作ってだべる！
            </button>
          </div>
        </div>
      )}

      {/* ─── メインコンテンツ ─── */}
      <main className={styles.mainContent}>
        {/* ヘッダー */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* モバイル用ハンバーガー */}
            <button
              className={styles.hamburgerBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="メニューを開く"
              type="button"
            >
              <span /><span /><span />
            </button>
            <h1 className={styles.headerTitle}>オンダベ</h1>
          </div>

          {/* 検索バー（ヘッダー内） */}
          <div className={styles.searchBar}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="部屋・ホスト名で検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="クリア"
              >✕</button>
            )}
          </div>

          {/* 部屋作成ボタン */}
          <button
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
            onClick={() => setShowModal(true)}
          >
            🎙️ 部屋を作る
          </button>
        </header>

        {/* ─── 部屋一覧 ─── */}
        <div className={styles.pageContent}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              🔴 ライブ中
              <span className="badge badge-live" style={{ marginLeft: 8 }}>{filteredRooms.length}</span>
            </span>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">{searchQuery ? '🔍' : '🎙️'}</span>
              <p className="empty-state-text">
                {searchQuery
                  ? `「${searchQuery}」に一致する部屋が見つかりませんでした`
                  : 'まだ部屋がありません。最初の部屋を作りましょう！'}
              </p>
              {!searchQuery && (
                <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
                  🎙️ 部屋を作る
                </button>
              )}
            </div>
          ) : (
            <div className={styles.roomGrid}>
              {filteredRooms.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
