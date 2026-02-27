'use client'
// 準備中ページの共通コンポーネント
import { useState } from 'react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar/Sidebar'
import styles from '@/app/page.module.css'

interface PlaceholderPageProps {
    icon: string
    title: string
    description: string
    /** 関連リンクのリスト（任意） */
    links?: { label: string; href: string }[]
}

export default function PlaceholderPage({ icon, title, description, links }: PlaceholderPageProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className={styles.layout}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={styles.mainContent}>
                {/* ヘッダー */}
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        {/* モバイル：ハンバーガーボタン */}
                        <button
                            className={styles.hamburgerBtn}
                            onClick={() => setSidebarOpen(true)}
                            aria-label="メニューを開く"
                        >
                            <span /><span /><span />
                        </button>
                        <span className={styles.headerTitle}>🎙️ オンダベ</span>
                    </div>
                    <div className={styles.headerRight}>
                        <Link href="/" className="btn-secondary" style={{ padding: '7px 16px', fontSize: '0.82rem' }}>
                            ← ホームへ戻る
                        </Link>
                    </div>
                </header>

                {/* コンテンツ */}
                <div className={styles.pageContent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
                    <div style={{
                        textAlign: 'center',
                        padding: '48px 32px',
                        maxWidth: 480,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 24,
                        backdropFilter: 'blur(12px)',
                        animation: 'fadeIn 0.4s ease forwards',
                    }}>
                        {/* アイコン */}
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: 20,
                            filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.4))',
                            animation: 'float 3s ease-in-out infinite',
                        }}>
                            {icon}
                        </div>

                        {/* タイトル */}
                        <h1 style={{
                            fontSize: '1.6rem',
                            fontWeight: 800,
                            color: 'var(--text-primary)',
                            marginBottom: 12,
                            letterSpacing: '-0.02em',
                        }}>
                            {title}
                        </h1>

                        {/* 説明 */}
                        <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.7,
                            marginBottom: 28,
                        }}>
                            {description}
                        </p>

                        {/* バッジ */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 16px',
                            background: 'rgba(124,58,237,0.1)',
                            border: '1px solid rgba(124,58,237,0.25)',
                            borderRadius: 999,
                            fontSize: '0.78rem',
                            color: 'var(--text-accent)',
                            fontWeight: 600,
                            marginBottom: links && links.length > 0 ? 24 : 0,
                        }}>
                            🚧 現在開発中
                        </div>

                        {/* 関連リンク */}
                        {links && links.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {links.map(link => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="btn-secondary"
                                        style={{ fontSize: '0.85rem', padding: '10px 20px' }}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
