// Firebase Authentication ユーティリティ
// Google・メール/パスワード・匿名認証をサポート
// また、匿名アカウントから正規アカウントへのアップグレードも対応
import {
  GoogleAuthProvider,
  EmailAuthProvider,
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  linkWithPopup,
  linkWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from './firebase'
import { createUserDocument, getUserDocument } from './firestore'

// =============================================
// 匿名認証（ゲストモード）
// =============================================

// ゲストとして匿名ログイン
// Firebase が自動で一時的な UID を発行する
export const signInAsGuest = async () => {
  const result = await firebaseSignInAnonymously(auth)
  const firebaseUser = result.user

  // Firestoreに匿名ユーザードキュメントを作成
  const existing = await getUserDocument(firebaseUser.uid)
  if (!existing) {
    const guestNumber = Math.floor(Math.random() * 9000) + 1000
    await createUserDocument(firebaseUser.uid, {
      username: `guest_${guestNumber}`,
      displayName: `ゲスト${guestNumber}`,
      bio: '',
      avatarUrl: null,
      followers: [],
      following: [],
      clubIds: [],
      isAnonymous: true,
      createdAt: new Date(),
    })
  }

  return firebaseUser
}

// =============================================
// 匿名アカウント → 正規アカウントへのアップグレード
// ※ 匿名ユーザーのデータを引き継いだまま本登録できる
// =============================================

// 匿名アカウントをメール/パスワードにアップグレード
export const upgradeAnonymousWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  username: string,
) => {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.isAnonymous) {
    throw new Error('匿名ユーザーではありません')
  }

  // 匿名アカウントにメール認証情報を紐付け
  const credential = EmailAuthProvider.credential(email, password)
  const result = await linkWithCredential(currentUser, credential)
  const firebaseUser = result.user

  // プロフィール名を設定
  await updateProfile(firebaseUser, { displayName })

  // Firestoreのユーザードキュメントをアップグレード（匿名フラグを削除）
  await createUserDocument(firebaseUser.uid, {
    username,
    displayName,
    bio: '',
    avatarUrl: null,
    followers: [],
    following: [],
    clubIds: [],
    isAnonymous: false,
    createdAt: new Date(),
  })

  return firebaseUser
}

// 匿名アカウントをGoogleアカウントにアップグレード
export const upgradeAnonymousWithGoogle = async () => {
  const currentUser = auth.currentUser
  if (!currentUser || !currentUser.isAnonymous) {
    throw new Error('匿名ユーザーではありません')
  }

  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await linkWithPopup(currentUser, provider)
  const firebaseUser = result.user

  // Firestoreのユーザードキュメントをアップグレード
  await createUserDocument(firebaseUser.uid, {
    username: firebaseUser.displayName?.replace(/\s+/g, '_').toLowerCase() ?? `user_${firebaseUser.uid.slice(0, 6)}`,
    displayName: firebaseUser.displayName ?? 'ユーザー',
    bio: '',
    avatarUrl: firebaseUser.photoURL ?? null,
    followers: [],
    following: [],
    clubIds: [],
    isAnonymous: false,
    createdAt: new Date(),
  })

  return firebaseUser
}

// =============================================
// 通常認証
// =============================================

// Googleログイン（新規ユーザー向け）
export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(auth, provider)
  const firebaseUser = result.user

  // Firestoreにユーザードキュメントを作成（初回ログイン時のみ）
  const existing = await getUserDocument(firebaseUser.uid)
  if (!existing) {
    await createUserDocument(firebaseUser.uid, {
      username: firebaseUser.displayName?.replace(/\s+/g, '_').toLowerCase() ?? `user_${firebaseUser.uid.slice(0, 6)}`,
      displayName: firebaseUser.displayName ?? 'ユーザー',
      bio: '',
      avatarUrl: firebaseUser.photoURL ?? null,
      followers: [],
      following: [],
      clubIds: [],
      isAnonymous: false,
      createdAt: new Date(),
    })
  }

  return firebaseUser
}

// メール/パスワードでサインアップ
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
  username: string,
) => {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  const firebaseUser = result.user

  // プロフィール名を設定
  await updateProfile(firebaseUser, { displayName })

  // Firestoreにユーザードキュメントを作成
  await createUserDocument(firebaseUser.uid, {
    username,
    displayName,
    bio: '',
    avatarUrl: null,
    followers: [],
    following: [],
    clubIds: [],
    isAnonymous: false,
    createdAt: new Date(),
  })

  return firebaseUser
}

// メール/パスワードでログイン
export const signInWithEmail = async (email: string, password: string) => {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

// ログアウト
export const logout = async () => {
  await signOut(auth)
}

// 認証状態の変化を監視するコールバック登録
export const onAuthChange = (
  callback: (user: FirebaseUser | null) => void,
) => {
  return onAuthStateChanged(auth, callback)
}
