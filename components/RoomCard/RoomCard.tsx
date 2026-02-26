'use client'
// 部屋カードコンポーネント — Connect.Club のルームカードUIを再現
import Link from 'next/link'
import type { Room } from '@/types'
import styles from './RoomCard.module.css'

interface RoomCardProps {
  room: Room
}

// 名前のイニシャルを取得
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

// 経過時間を日本語で表示
const formatTimeAgo = (date: Date) => {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  return `${hours}時間前`
}

export default function RoomCard({ room }: RoomCardProps) {
  const displaySpeakers = room.speakers.slice(0, 4)
  const hasMoreSpeakers = room.speakers.length > 4

  return (
    <Link href={`/room/${room.id}`} className={styles.card}>
      {/* ヘッダー：クラブバッジ・LIVEバッジ */}
      <div className={styles.cardHeader}>
        <div className={styles.cardMeta}>
          <span className="badge badge-live">LIVE</span>
          {room.clubName && (
            <span className={styles.clubBadge}>🏛️ {room.clubName}</span>
          )}
        </div>
        <div className={styles.cardActions}>
          <span className={styles.timeAgo}>{formatTimeAgo(room.createdAt)}</span>
        </div>
      </div>

      {/* タイトル・説明 */}
      <div>
        <h3 className={styles.cardTitle}>{room.name}</h3>
        {room.description && (
          <p className={styles.cardDescription}>{room.description}</p>
        )}
      </div>

      {/* スピーカー一覧 */}
      <div className={styles.speakerSection}>
        <p className={styles.speakerLabel}>🎙️ スピーカー</p>
        <div className={styles.speakerList}>
          {displaySpeakers.map((speaker) => (
            <div key={speaker.userId} className={styles.speakerItem}>
              <div
                className={`${styles.speakerAvatar} ${speaker.isSpeaking ? styles.speaking : ''}`}
              >
                {getInitials(speaker.displayName)}
                {/* マイクアイコン */}
                <span className={styles.speakerMicIcon}>
                  {speaker.isMuted ? '🔇' : '🎙️'}
                </span>
              </div>
              <div className={styles.speakerInfo}>
                <span className={styles.speakerName}>{speaker.displayName}</span>
                <span className={styles.speakerRole}>
                  {speaker.role === 'host' ? 'ホスト' : 'スピーカー'}
                </span>
              </div>
            </div>
          ))}
          {hasMoreSpeakers && (
            <div className={styles.speakerItem}>
              <div className={styles.speakerAvatar} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                +{room.speakers.length - 4}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* フッター：統計・タグ・参加ボタン */}
      <div className={styles.cardFooter}>
        <div className={styles.statsRow}>
          <span className={styles.stat}>
            <span className={styles.statIcon}>🎙️</span>
            {room.speakers.length}
          </span>
          <span className={styles.stat}>
            <span className={styles.statIcon}>🎧</span>
            {room.listeners.length}
          </span>
          <span className={styles.stat}>
            <span className={styles.statIcon}>👥</span>
            {room.participantCount}人
          </span>
        </div>

        <div className={styles.tagList}>
          {room.tags.slice(0, 2).map(tag => (
            <span key={tag} className={styles.tag}>#{tag}</span>
          ))}
        </div>
      </div>

      {/* 参加ボタン（ホバー時に表示感を強調） */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span className={styles.joinBtn}>
          🎙️ 参加する
        </span>
      </div>
    </Link>
  )
}
