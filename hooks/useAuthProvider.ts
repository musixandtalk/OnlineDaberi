'use client'
// Firebase 認証状態を管理するカスタムフック
// コンポーネントがマウントされた時点から認証状態を監視し、
// Zustand ストアに反映する
import { useEffect } from 'react'
import { onAuthChange } from '@/lib/auth'
import { getUserDocument } from '@/lib/firestore'
import { useAuthStore } from '@/store'

export function useAuthProvider() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // Firebase の onAuthStateChanged を監視
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        // Firestore からユーザー情報を取得してストアに保存
        const userDoc = await getUserDocument(firebaseUser.uid)
        setUser(userDoc)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    // クリーンアップ（コンポーネントアンマウント時に監視解除）
    return () => unsubscribe()
  }, [setUser, setLoading])
}
