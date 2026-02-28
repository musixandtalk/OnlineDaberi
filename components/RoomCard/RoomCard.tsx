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
      {/* ヘッダー：LIVEバッジ・時間 */}
      <div className={styles.cardHeader}>
        <span className="badge badge-live">LIVE</span>
        <span className={styles.timeAgo}>{formatTimeAgo(room.createdAt)}</span>
      </div>

      {/* タイトル・説明 */}
      <div className={styles.contentArea}>
        <h3 className={styles.cardTitle}>{room.name}</h3>
        {room.description && (
          <p className={styles.cardDescription}>{room.description}</p>
        )}
      </div>

      {/* フッター：アバター一覧と参加人数 */}
      <div className={styles.cardFooter}>
        <div className={styles.speakerList}>
          {displaySpeakers.map((speaker, index) => (
            <div key={speaker.userId} className={styles.simpleAvatar} style={{ zIndex: 10 - index }}>
              {getInitials(speaker.displayName)}
            </div>
          ))}
          {hasMoreSpeakers && (
            <div className={styles.simpleAvatar} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
              +{room.speakers.length - 4}
            </div>
          )}
        </div>

        <div className={styles.statsRow}>
          <span className={styles.stat}>👥 {room.participantCount}人</span>
        </div>
      </div>
    </Link>
  )
}
