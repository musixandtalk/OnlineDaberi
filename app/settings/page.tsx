'use client'
// 設定ページ — 表示名・通知・プライバシー・音声設定
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar/Sidebar'
import { mockCurrentUser } from '@/lib/mockData'
import pageStyles from '@/app/page.module.css'
import styles from './settings.module.css'

export default function SettingsPage() {
    const router = useRouter()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [saved, setSaved] = useState(false)

    // プロフィール設定
    const [displayName, setDisplayName] = useState(mockCurrentUser.displayName)
    const [username, setUsername] = useState(mockCurrentUser.username)
    const [bio, setBio] = useState('オンダベ大好き 🎙️')

    // 通知設定
    const [notifyRoom, setNotifyRoom] = useState(true)
    const [notifyFollow, setNotifyFollow] = useState(true)
    const [notifyClub, setNotifyClub] = useState(false)

    // プライバシー設定
    const [isPublicProfile, setIsPublicProfile] = useState(true)
    const [showActivity, setShowActivity] = useState(true)

    // 音声設定
    const [defaultMuted, setDefaultMuted] = useState(true)
    const [echoCancelOn, setEchoCancelOn] = useState(true)
    const [noiseSuppOn, setNoiseSuppOn] = useState(true)

    // 言語設定
    const [lang, setLang] = useState('ja')

    // 保存処理（現時点はローカル状態のみ更新）
    const handleSave = () => {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    // トグルスイッチ部品
    const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
        <label className={styles.toggle}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className={styles.toggleSlider} />
        </label>
    )

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
                            ← ホームへ戻る
                        </button>
                    </div>
                </header>

                {/* 設定コンテンツ */}
                <div className={pageStyles.pageContent}>
                    <div className={styles.page}>

                        <h1 className={styles.pageTitle}>⚙️ 設定</h1>

                        {/* 保存完了メッセージ */}
                        {saved && <div className={styles.savedBanner}>✅ 設定を保存しました！</div>}

                        {/* ─── プロフィール設定 ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>👤</span>
                                <span className={styles.sectionTitle}>プロフィール</span>
                            </div>
                            <div className={styles.row}>
                                <div>
                                    <div className={styles.rowLabel}>表示名</div>
                                    <div className={styles.rowSub}>他のユーザーに表示される名前</div>
                                </div>
                                <input
                                    className={styles.textInput}
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    maxLength={30}
                                    placeholder="表示名"
                                />
                            </div>
                            <div className={styles.row}>
                                <div>
                                    <div className={styles.rowLabel}>ユーザー名</div>
                                    <div className={styles.rowSub}>@から始まるID（英数字・アンダーバー）</div>
                                </div>
                                <input
                                    className={styles.textInput}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    maxLength={20}
                                    placeholder="username"
                                />
                            </div>
                            <div className={styles.row} style={{ alignItems: 'flex-start' }}>
                                <div>
                                    <div className={styles.rowLabel}>自己紹介</div>
                                    <div className={styles.rowSub}>プロフィールに表示されます（5,000文字まで）</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, maxWidth: 280 }}>
                                    <textarea
                                        className={styles.textInput}
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        maxLength={5000}
                                        placeholder="自己紹介を入力..."
                                        rows={4}
                                        style={{
                                            width: '100%',
                                            resize: 'vertical',
                                            lineHeight: 1.6,
                                            fontFamily: 'inherit',
                                            minHeight: 80,
                                        }}
                                    />
                                    <span style={{ fontSize: '0.7rem', color: bio.length > 4800 ? '#f87171' : 'var(--text-muted)', textAlign: 'right' }}>
                                        {bio.length.toLocaleString()} / 5,000
                                    </span>
                                </div>
                            </div>

                        </div>

                        {/* ─── 通知設定 ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🔔</span>
                                <span className={styles.sectionTitle}>通知</span>
                            </div>
                            {[
                                { label: 'フォロー中のユーザーが部屋を作成', sub: '通知を受け取る', checked: notifyRoom, set: setNotifyRoom },
                                { label: '新しいフォロワー', sub: '誰かがフォローしたとき', checked: notifyFollow, set: setNotifyFollow },
                                { label: 'クラブのお知らせ', sub: '参加中クラブからの通知', checked: notifyClub, set: setNotifyClub },
                            ].map(item => (
                                <div key={item.label} className={styles.row}>
                                    <div>
                                        <div className={styles.rowLabel}>{item.label}</div>
                                        <div className={styles.rowSub}>{item.sub}</div>
                                    </div>
                                    <Toggle checked={item.checked} onChange={item.set} />
                                </div>
                            ))}
                        </div>

                        {/* ─── プライバシー設定 ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🔒</span>
                                <span className={styles.sectionTitle}>プライバシー</span>
                            </div>
                            {[
                                { label: 'プロフィールを公開', sub: 'オフにすると自分のフォロワーのみ閲覧可能', checked: isPublicProfile, set: setIsPublicProfile },
                                { label: 'アクティビティを表示', sub: '参加中の部屋を他のユーザーに見せる', checked: showActivity, set: setShowActivity },
                            ].map(item => (
                                <div key={item.label} className={styles.row}>
                                    <div>
                                        <div className={styles.rowLabel}>{item.label}</div>
                                        <div className={styles.rowSub}>{item.sub}</div>
                                    </div>
                                    <Toggle checked={item.checked} onChange={item.set} />
                                </div>
                            ))}
                        </div>

                        {/* ─── 音声設定 ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🎙️</span>
                                <span className={styles.sectionTitle}>音声</span>
                            </div>
                            {[
                                { label: '入室時にマイクをミュート', sub: '部屋に入ったときデフォルトでミュート', checked: defaultMuted, set: setDefaultMuted },
                                { label: 'エコーキャンセル', sub: 'ハウリングを自動で抑制', checked: echoCancelOn, set: setEchoCancelOn },
                                { label: 'ノイズ抑制', sub: '背景ノイズを自動カット', checked: noiseSuppOn, set: setNoiseSuppOn },
                            ].map(item => (
                                <div key={item.label} className={styles.row}>
                                    <div>
                                        <div className={styles.rowLabel}>{item.label}</div>
                                        <div className={styles.rowSub}>{item.sub}</div>
                                    </div>
                                    <Toggle checked={item.checked} onChange={item.set} />
                                </div>
                            ))}
                        </div>

                        {/* ─── 言語・地域 ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🌐</span>
                                <span className={styles.sectionTitle}>言語・地域</span>
                            </div>
                            <div className={styles.row}>
                                <div>
                                    <div className={styles.rowLabel}>表示言語</div>
                                    <div className={styles.rowSub}>アプリの表示言語を選択</div>
                                </div>
                                <select className={styles.select} value={lang} onChange={e => setLang(e.target.value)}>
                                    <option value="ja">🇯🇵 日本語</option>
                                    <option value="en">🇺🇸 English</option>
                                </select>
                            </div>
                        </div>

                        {/* ─── アカウント ─── */}
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <span className={styles.sectionIcon}>🚨</span>
                                <span className={styles.sectionTitle}>アカウント</span>
                            </div>
                            <div className={styles.row}>
                                <div>
                                    <div className={styles.rowLabel}>ログアウト</div>
                                    <div className={styles.rowSub}>このデバイスからサインアウトします</div>
                                </div>
                                <button className={styles.dangerBtn} onClick={() => router.push('/login')}>
                                    ログアウト
                                </button>
                            </div>
                            <div className={styles.row}>
                                <div>
                                    <div className={styles.rowLabel}>アカウントを削除</div>
                                    <div className={styles.rowSub}>削除すると元に戻せません</div>
                                </div>
                                <button className={styles.dangerBtn} onClick={() => alert('現在この機能は開発中です。')}>
                                    削除する
                                </button>
                            </div>
                        </div>

                        {/* 保存ボタン */}
                        <button className={styles.saveBtn} onClick={handleSave}>
                            ✅ 設定を保存する
                        </button>

                    </div>
                </div>
            </main>
        </div>
    )
}
