'use client'
// サイドバーコンポーネント — オンダベのナビゲーション構造
// モバイルではドロワー方式で開閉。isOpen/onClose をpropsで受け取る。
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Sidebar.module.css'
import { mockClubs, mockCurrentUser } from '@/lib/mockData'

const navItems = [
  { icon: '🏠', label: 'ホーム',     href: '/' },
  { icon: '🔥', label: 'トレンド',   href: '/trending' },
  { icon: '📅', label: 'イベント',   href: '/events' },
  { icon: '🔔', label: '通知',       href: '/notifications', badge: 3 },
]

const secondaryNavItems = [
  { icon: '👤', label: 'プロフィール', href: `/user/${mockCurrentUser.username}` },
  { icon: '⚙️', label: '設定',       href: '/settings' },
]

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

interface SidebarProps {
  isOpen?: boolean      // モバイルで開いているか
  onClose?: () => void  // モバイルで閉じるコールバック
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  // リンクをタップしたらモバイルでドロワーを閉じる
  const handleNavClick = () => { onClose?.() }

  return (
    <>
      {/* ─── モバイル用オーバーレイ（背後をタップで閉じる） ─── */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        {/* ロゴ + モバイル閉じるボタン */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🎙️</div>
          <span className={styles.logoText}>オンダベ</span>
          {/* モバイルのみ表示される ✕ ボタン */}
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="メニューを閉じる"
          >
            ✕
          </button>
        </div>

        {/* メインナビゲーション */}
        <nav className={styles.nav}>
          <div className={styles.navSection}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                onClick={handleNavClick}
              >
                <span className={styles.navItemIcon}>{item.icon}</span>
                {item.label}
                {item.badge && (
                  <span className={styles.navItemBadge}>{item.badge}</span>
                )}
              </Link>
            ))}
          </div>

          {/* 参加中のクラブ */}
          <div className={styles.navSection}>
            <p className={styles.navSectionLabel}>参加中のクラブ</p>
            <div className={styles.clubList}>
              {mockClubs
                .filter(club => club.memberIds.includes(mockCurrentUser.id))
                .map((club) => (
                  <Link
                    key={club.id}
                    href={`/club/${club.slug}`}
                    className={styles.clubItem}
                    onClick={handleNavClick}
                  >
                    <div className={styles.clubAvatar}>
                      {getInitials(club.name)}
                    </div>
                    <span className={styles.clubName}>{club.name}</span>
                  </Link>
                ))}
              <Link href="/clubs" className={styles.clubItem} onClick={handleNavClick}>
                <div className={styles.clubAvatar} style={{ background: 'var(--bg-glass)' }}>＋</div>
                <span className={styles.clubName}>クラブを探す</span>
              </Link>
            </div>
          </div>

          {/* サブナビゲーション */}
          <div className={styles.navSection}>
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                onClick={handleNavClick}
              >
                <span className={styles.navItemIcon}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* ユーザーカード（下部） */}
        <div className={styles.userArea}>
          <div className={styles.userCard}>
            <div
              style={{
                background: 'var(--accent-gradient)',
                width: 36, height: 36,
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
              }}
            >
              {getInitials(mockCurrentUser.displayName)}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{mockCurrentUser.displayName}</p>
              <p className={styles.userHandle}>@{mockCurrentUser.username}</p>
            </div>
            <button className={styles.userSettings} title="設定">⚙️</button>
          </div>
        </div>
      </aside>
    </>
  )
}
