'use client'
// ゲストユーザー向けアップグレードバナー + モーダル
// 匿名ユーザーが気に入ったらそのままアカウント作成できる
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upgradeAnonymousWithEmail, upgradeAnonymousWithGoogle } from '@/lib/auth'
import styles from './UpgradeBanner.module.css'

interface UpgradeBannerProps {
  guestName: string // 現在のゲスト名（例: ゲスト1234）
}

type UpgradeTab = 'email' | 'google'

// アカウント所有時の特典リスト
const BENEFITS = [
  { icon: '💬', text: 'チャットで発言できる' },
  { icon: '✋', text: 'スピーカーに昇格できる' },
  { icon: '🏛️', text: 'クラブに参加・作成できる' },
  { icon: '📅', text: 'イベントを予定できる' },
  { icon: '💾', text: 'フォロー・履歴が保存される' },
]

export default function UpgradeBanner({ guestName }: UpgradeBannerProps) {
  const router = useRouter()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<UpgradeTab>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // フォーム値
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')

  // エラー日本語化
  const translateError = (code: string): string => {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'このメールアドレスはすでに使用されています',
      'auth/weak-password': 'パスワードは6文字以上で設定してください',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/credential-already-in-use': 'このGoogleアカウントはすでに別のユーザーと紐付けられています',
      'auth/network-request-failed': 'ネットワークエラーが発生しました',
      'auth/popup-closed-by-user': 'キャンセルされました',
    }
    return map[code] ?? 'エラーが発生しました。もう一度お試しください'
  }

  // メールでアップグレード
  const handleEmailUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !username.trim()) {
      setError('すべての項目を入力してください')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      await upgradeAnonymousWithEmail(email, password, displayName, username)
      setIsSuccess(true)
      setTimeout(() => { setIsModalOpen(false); router.refresh() }, 1800)
    } catch (err: unknown) {
      const fe = err as { code?: string }
      setError(translateError(fe.code ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  // Googleでアップグレード
  const handleGoogleUpgrade = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await upgradeAnonymousWithGoogle()
      setIsSuccess(true)
      setTimeout(() => { setIsModalOpen(false); router.refresh() }, 1800)
    } catch (err: unknown) {
      const fe = err as { code?: string }
      setError(translateError(fe.code ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  // バナーを非表示にした場合
  if (isDismissed) return null

  return (
    <>
      {/* ─── 上部固定バナー ─── */}
      <div className={styles.banner}>
        <span className={styles.bannerIcon}>👤</span>
        <p className={styles.bannerText}>
          <strong>ゲストモードで参加中</strong>（{guestName}）
          &nbsp;—&nbsp;アカウントを作ると、もっと楽しめます！
        </p>
        <div className={styles.bannerActions}>
          <button
            className={styles.upgradeBtn}
            onClick={() => setIsModalOpen(true)}
          >
            ✨ アカウントを作る
          </button>
          <button
            className={styles.dismissBtn}
            onClick={() => setIsDismissed(true)}
          >
            後で
          </button>
        </div>
      </div>

      {/* ─── アップグレードモーダル ─── */}
      {isModalOpen && (
        <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false) }}>
          <div className={styles.modal}>
            {/* ヘッダー */}
            <div className={styles.modalHeader}>
              <button className={styles.modalCloseBtn} onClick={() => setIsModalOpen(false)}>✕</button>
              <div className={styles.modalEmoji}>🚀</div>
              <h2 className={styles.modalTitle}>アカウントを作成する</h2>
              <p className={styles.modalSubtitle}>
                今の会話の続きはそのまま。<br />
                ゲストとしてのデータを引き継いでアカウント登録できます。
              </p>
            </div>

            {/* 成功メッセージ */}
            {isSuccess ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🎉</div>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  登録完了！
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  アカウントが作成されました。これからもっと楽しめます！
                </p>
              </div>
            ) : (
              <>
                {/* 特典リスト */}
                <div className={styles.benefits}>
                  {BENEFITS.map((b, i) => (
                    <div key={i} className={styles.benefitItem}>
                      <span className={styles.benefitIcon}>{b.icon}</span>
                      <span>{b.text}</span>
                    </div>
                  ))}
                </div>

                {/* タブ切替 */}
                <div className={styles.modalTabs}>
                  <button
                    className={`${styles.modalTab} ${activeTab === 'email' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('email'); setError(null) }}
                  >
                    📧 メール
                  </button>
                  <button
                    className={`${styles.modalTab} ${activeTab === 'google' ? styles.active : ''}`}
                    onClick={() => { setActiveTab('google'); setError(null) }}
                  >
                    🔵 Google
                  </button>
                </div>

                <div className={styles.modalForm}>
                  {/* エラー表示 */}
                  {error && <div className={styles.formError}>⚠️ {error}</div>}

                  {activeTab === 'email' ? (
                    /* メール登録フォーム */
                    <form onSubmit={handleEmailUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>表示名</label>
                        <input
                          type="text"
                          placeholder="例：Hiroki Yamada"
                          value={displayName}
                          onChange={e => setDisplayName(e.target.value)}
                          className={styles.formInput}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>ユーザー名（@以降）</label>
                        <input
                          type="text"
                          placeholder="例：hiroki_dev"
                          value={username}
                          onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          className={styles.formInput}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>メールアドレス</label>
                        <input
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className={styles.formInput}
                          required
                        />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>パスワード（6文字以上）</label>
                        <input
                          type="password"
                          placeholder="パスワード"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className={styles.formInput}
                          required
                          minLength={6}
                        />
                      </div>
                      <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isLoading}
                      >
                        {isLoading ? <span className={styles.spinner} /> : '🚀 アカウントを作成'}
                      </button>
                    </form>
                  ) : (
                    /* Googleアップグレード */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
                        Googleアカウントと連携するだけで完了です。<br />
                        現在のゲストデータはそのまま引き継がれます。
                      </p>
                      <button
                        className={styles.googleUpgradeBtn}
                        onClick={handleGoogleUpgrade}
                        disabled={isLoading}
                      >
                        {isLoading
                          ? <span className={styles.spinner} style={{ borderTopColor: 'var(--accent-primary)' }} />
                          : <>🔵 Google で登録する</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
