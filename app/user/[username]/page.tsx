'use client'
// プロフィールページ — ユーザー詳細表示
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import { mockCurrentUser, mockClubs, mockRooms } from '@/lib/mockData'
import pageStyles from '@/app/page.module.css'
import styles from './profile.module.css'

// イニシャル取得
function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function UserProfilePage() {
    const params = useParams()
    const router = useRouter()
    const username = params.username as string
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // 自分のプロフィールかどうか判定
    const isMe = username === mockCurrentUser.username
    const user = mockCurrentUser // デモ用：常に同じユーザーを表示

    // 参加中のクラブ
    const myClubs = mockClubs.filter(c => c.memberIds.includes(user.id))

    // 最近の部屋（デモ用 mock）
    const recentRooms = mockRooms.slice(0, 3)

    // フォロー状態（ローカルのみ）
    const [following, setFollowing] = useState(false)

    return (
        <div className={pageStyles.layout}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={pageStyles.mainContent}>
                {/* ヘッダー */}
                <header className={pageStyles.header}>
                    <div className={pageStyles.headerLeft}>
                        <button className={pageStyles.hamburgerBtn} onClick={() => setSidebarOpen(true)} aria-label="メニューを開く">
                            <span /><span /><span />
                        </button>
                        <span className={pageStyles.headerTitle}>🎙️ オンダベ</span>
                    </div>
                    <div className={pageStyles.headerRight}>
                        <button className="btn-secondary" style={{ padding: '7px 16px', fontSize: '0.82rem' }} onClick={() => router.push('/')}>
                            ← ホームへ
                        </button>
                    </div>
                </header>

                <div className={pageStyles.pageContent} style={{ padding: 0 }}>
                    <div className={styles.page}>

                        {/* バナー */}
                        <div className={styles.banner} />

                        {/* プロフィールヘッダー */}
                        <div className={styles.profileHeader}>
                            {/* アバター */}
                            <div className={styles.avatarWrap}>
                                <div className={styles.avatar}>
                                    {getInitials(user.displayName)}
                                </div>
                            </div>

                            {/* フォロー / 設定ボタン */}
                            <div className={styles.profileActions}>
                                {isMe ? (
                                    <Link href="/settings" className="btn-secondary" style={{ fontSize: '0.85rem', padding: '9px 18px' }}>
                                        ⚙️ 設定
                                    </Link>
                                ) : (
                                    <button
                                        className={following ? 'btn-secondary' : 'btn-primary'}
                                        style={{ fontSize: '0.85rem', padding: '9px 18px' }}
                                        onClick={() => setFollowing(f => !f)}
                                    >
                                        {following ? 'フォロー中 ✓' : '➕ フォロー'}
                                    </button>
                                )}
                            </div>

                            {/* ユーザー情報 */}
                            <div className={styles.profileInfo}>
                                <div className={styles.displayName}>{user.displayName}</div>
                                <div className={styles.handle}>@{username}</div>
                                <div className={styles.bio}>
                                    オンダベが大好き 🎙️ 音楽・テック・雑談なんでも。気軽に話しかけてね！
                                </div>

                                {/* フォロワー数 */}
                                <div className={styles.stats}>
                                    <div className={styles.statItem}>
                                        <span className={styles.statNum}>128</span>
                                        <span className={styles.statLabel}>フォロー中</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statNum}>342</span>
                                        <span className={styles.statLabel}>フォロワー</span>
                                    </div>
                                    <div className={styles.statItem}>
                                        <span className={styles.statNum}>47</span>
                                        <span className={styles.statLabel}>部屋参加</span>
                                    </div>
                                </div>

                                {/* タグ */}
                                <div className={styles.tags}>
                                    {['🎵 音楽', '💻 テック', '🎮 ゲーム', '☕ 雑談'].map(tag => (
                                        <span key={tag} className={styles.tag}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 参加中のクラブ */}
                        {myClubs.length > 0 && (
                            <div className={styles.section} style={{ padding: '0 28px' }}>
                                <div className={styles.sectionTitle}>🏛️ 参加中のクラブ</div>
                                <div className={styles.clubGrid}>
                                    {myClubs.map(club => (
                                        <Link key={club.id} href={`/club/${club.slug}`} className={styles.clubCard}>
                                            <div className={styles.clubAvatar}>{getInitials(club.name)}</div>
                                            <span className={styles.clubName}>{club.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 最近参加した部屋 */}
                        <div className={styles.section} style={{ padding: '0 28px' }}>
                            <div className={styles.sectionTitle}>🎙️ 最近参加した部屋</div>
                            <div className={styles.roomList}>
                                {recentRooms.map(room => (
                                    <Link key={room.id} href={`/room/${room.id}`} className={styles.roomItem}>
                                        <span className={styles.roomIcon}>🎙️</span>
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomName}>{room.name}</div>
                                            <div className={styles.roomMeta}>
                                                {room.participantCount}人参加 · {room.tags.slice(0, 2).join(', ')}
                                            </div>
                                        </div>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>→</span>
                                    </Link>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    )
}
