'use client'
// ログイン・サインアップページ
// Google認証・メール認証・匿名（ゲスト）認証をサポート
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } from '@/lib/auth'
import styles from './auth.module.css'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // フォーム入力値
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')

  // エラーメッセージを日本語に変換
  const translateError = (code: string): string => {
    const errorMap: Record<string, string> = {
      'auth/email-already-in-use': 'このメールアドレスはすでに使用されています',
      'auth/invalid-email': 'メールアドレスの形式が正しくありません',
      'auth/weak-password': 'パスワードは6文字以上で設定してください',
      'auth/user-not-found': 'メールアドレスまたはパスワードが間違っています',
      'auth/wrong-password': 'メールアドレスまたはパスワードが間違っています',
      'auth/too-many-requests': 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください',
      'auth/network-request-failed': 'ネットワークエラーが発生しました。接続を確認してください',
      'auth/popup-closed-by-user': 'ログインがキャンセルされました',
    }
    return errorMap[code] ?? 'エラーが発生しました。もう一度お試しください'
  }

  // Googleログイン
  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
      router.push('/')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(translateError(firebaseError.code ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  // ゲスト（匿名）ログイン
  const handleGuestLogin = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await signInAsGuest()
      router.push('/')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(translateError(firebaseError.code ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  // メール認証フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
      } else {
        if (!displayName.trim()) {
          setError('表示名を入力してください')
          setIsLoading(false)
          return
        }
        if (!username.trim()) {
          setError('ユーザー名を入力してください')
          setIsLoading(false)
          return
        }
        await signUpWithEmail(email, password, displayName, username)
      }
      router.push('/')
    } catch (err: unknown) {
      const firebaseError = err as { code?: string }
      setError(translateError(firebaseError.code ?? ''))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        {/* ロゴ */}
        <div className={styles.authLogo}>
          <div className={styles.authLogoIcon}>🎙️</div>
          <span className={styles.authLogoText}>オンダベ</span>
        </div>

        {/* タイトル */}
        <h1 className={styles.authTitle}>
          {mode === 'login' ? 'おかえりなさい 👋' : 'オンダベに登録する 🚀'}
        </h1>
        <p className={styles.authSubtitle}>
          {mode === 'login'
            ? '音声でつながるソーシャル体験が待っています'
            : '今すぐ参加して、音声の会話を楽しもう'}
        </p>

        {/* タブ */}
        <div className={styles.authTabs}>
          <button
            className={`${styles.authTab} ${mode === 'login' ? styles.active : ''}`}
            onClick={() => { setMode('login'); setError(null) }}
          >
            ログイン
          </button>
          <button
            className={`${styles.authTab} ${mode === 'signup' ? styles.active : ''}`}
            onClick={() => { setMode('signup'); setError(null) }}
          >
            新規登録
          </button>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className={styles.formError}>⚠️ {error}</div>
        )}

        {/* フォーム */}
        <form onSubmit={handleSubmit} className={styles.authForm}>
          {/* サインアップ時のみ表示するフィールド */}
          {mode === 'signup' && (
            <>
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
            </>
          )}

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
            <label className={styles.formLabel}>パスワード</label>
            <input
              type="password"
              placeholder={mode === 'signup' ? '6文字以上' : 'パスワード'}
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
            {isLoading
              ? <span className={styles.spinner} />
              : mode === 'login' ? 'ログイン' : 'アカウントを作成'
            }
          </button>
        </form>

        {/* 区切り線 */}
        <div className={styles.divider}>
          <div className={styles.dividerLine} />
          <span className={styles.dividerText}>または</span>
          <div className={styles.dividerLine} />
        </div>

        {/* Googleログイン */}
        <button
          id="google-login-btn"
          className={styles.googleBtn}
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <span className={styles.googleIcon}>🔵</span>
          Google でログイン
        </button>

        {/* ゲストとして参加ボタン */}
        <button
          id="guest-login-btn"
          className={styles.guestBtn}
          onClick={handleGuestLogin}
          disabled={isLoading}
        >
          👤 アカウントなしで参加（ゲスト）
        </button>

        {/* ゲストモードの説明 */}
        <p className={styles.guestNote}>
          💡 ゲストモードでも部屋に参加して聴くことができます。
          気に入ったら、後でかんたんにアカウントに移行できます。
        </p>

        {/* フッター */}
        <p className={styles.authFooter}>
          {mode === 'login' ? (
            <>
              アカウントをお持ちでないですか？{' '}
              <span
                className={styles.authFooterLink}
                onClick={() => { setMode('signup'); setError(null) }}
              >
                新規登録
              </span>
            </>
          ) : (
            <>
              すでにアカウントをお持ちですか？{' '}
              <span
                className={styles.authFooterLink}
                onClick={() => { setMode('login'); setError(null) }}
              >
                ログイン
              </span>
            </>
          )}
          <br />
          <small>
            続行することで
            <a href="#" style={{ color: 'var(--text-accent)' }}>利用規約</a>
            と
            <a href="#" style={{ color: 'var(--text-accent)' }}>プライバシーポリシー</a>
            に同意したことになります
          </small>
        </p>
      </div>
    </div>
  )
}
