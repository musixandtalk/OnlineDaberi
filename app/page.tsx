'use client'
// ホームページ — オンダベ（OnlineDaberi）のフィードUI
import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar/Sidebar'
import RoomCard from '@/components/RoomCard/RoomCard'
import { mockRooms, mockClubs, mockEvents } from '@/lib/mockData'
import styles from './page.module.css'

// タブの定義
const FILTER_TABS = [
  { id: 'all', label: '🌐 すべて' },
  { id: 'clubs', label: '🏛️ マイクラブ' },
  { id: 'following', label: '❤️ フォロー中' },
  { id: 'new', label: '🆕 新着' },
]

// クラブのイニシャルを取得
const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

// イベント時刻のフォーマット
const formatEventTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const isToday = date.toDateString() === new Date().toDateString()
  return {
    time: `${hours}:${minutes}`,
    day: isToday ? '今日' : '明日',
  }
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // フィルターに応じて表示する部屋を変更
  const filteredRooms = mockRooms

  return (
    <div className={styles.layout}>
      {/* サイドバー（モバイルではドロワー） */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* メインコンテンツエリア */}
      <main className={styles.mainContent}>
        {/* スティッキーヘッダー */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* モバイル用ハンバーガーボタン */}
            <button
              className={styles.hamburgerBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="メニューを開く"
            >
              <span /><span /><span />
            </button>
            <h1 className={styles.headerTitle}>はなしば</h1>
          </div>
          <div className={styles.headerRight}>
            {/* 検索バー */}
            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="部屋・クラブ・ユーザーを検索..."
                className={styles.searchInput}
              />
            </div>
            {/* 部屋作成ボタン */}
            <button
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              🎙️ 部屋を作る
            </button>
          </div>
        </header>

        {/* ページコンテンツ */}
        <div className={styles.pageContent}>
          {/* ヒーローカード（ウェルカムメッセージ） */}
          <div className={styles.hero}>
            <h2 className={styles.heroTitle}>おかえり、ゲストさん 👋</h2>
            <p className={styles.heroSubtitle}>
              今も誰かがだべってる。部屋を作って、気軽に話しかけてみよう。
            </p>
            <div className={styles.heroActions}>
              <button className="btn-primary">🎙️ 今すぐだべる</button>
              <button className="btn-secondary">📅 だべり予定を入れる</button>
            </div>
          </div>

          {/* フィルタータブ */}
          <div className={styles.filterTabs}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ライブ部屋セクション */}
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                🔴 ライブ中の部屋
                <span className="badge badge-live">{filteredRooms.length}</span>
              </h2>
              <Link href="/rooms" className={styles.sectionLink}>
                すべて見る →
              </Link>
            </div>

            <div className={styles.roomGrid}>
              {filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </section>

          {/* スケジュールイベントセクション */}
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📅 近日開催のイベント</h2>
              <Link href="/events" className={styles.sectionLink}>
                すべて見る →
              </Link>
            </div>

            <div className={styles.eventList}>
              {mockEvents.map((event) => {
                const { time, day } = formatEventTime(event.scheduledAt)
                return (
                  <div key={event.id} className={styles.eventCard}>
                    {/* 時刻 */}
                    <div className={styles.eventTime}>
                      <span className={styles.eventTimeHour}>{time}</span>
                      <span className={styles.eventTimeDay}>{day}</span>
                    </div>
                    {/* 情報 */}
                    <div className={styles.eventInfo}>
                      <h3 className={styles.eventTitle}>{event.title}</h3>
                      <div className={styles.eventMeta}>
                        <span className={styles.eventHost}>by {event.hostName}</span>
                        {event.clubName && (
                          <span className="badge badge-members">🏛️ {event.clubName}</span>
                        )}
                        <span className={styles.eventParticipants}>
                          👥 {event.participantCount}人が参加予定
                        </span>
                      </div>
                    </div>
                    {/* 参加ボタン */}
                    <button
                      className={
                        event.isJoined
                          ? styles.eventJoinBtnJoined
                          : styles.eventJoinBtnNotJoined
                      }
                    >
                      {event.isJoined ? '✅ 参加済み' : '📅 参加する'}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>

          {/* おすすめクラブセクション */}
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🏛️ おすすめのクラブ</h2>
              <Link href="/clubs" className={styles.sectionLink}>
                すべて見る →
              </Link>
            </div>

            <div className={styles.clubGrid}>
              {mockClubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/club/${club.slug}`}
                  className={styles.clubCardItem}
                >
                  <div className={styles.clubCardImage}>
                    {getInitials(club.name)}
                  </div>
                  <p className={styles.clubCardName}>{club.name}</p>
                  <p className={styles.clubCardDesc}>{club.description}</p>
                  <p className={styles.clubCardMembers}>
                    👥 {club.memberCount.toLocaleString()}人のメンバー
                  </p>
                  <button
                    className={
                      club.isFollowing
                        ? styles.clubFollowBtnFollowing
                        : styles.clubFollowBtnNotFollowing
                    }
                    onClick={(e) => e.preventDefault()}
                  >
                    {club.isFollowing ? '✅ フォロー中' : '＋ フォロー'}
                  </button>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
