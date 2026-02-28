'use client'
// BGMプレイヤー（ルーム内専用）
// ・URLを入力して▶で再生 → プレイヤーが展開表示
// ・「閉じる」を押したら停止＆折りたたむ
// ・YouTube IFrame API 使用（Data APIキー不要・無料）
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './BGMPlayer.module.css'

// ─── 型定義 ────────────────────────────────────────
interface Track { id: string; name: string; flag: string }

declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: object) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady: () => void
  }
}
interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  setVolume(v: number): void
  loadVideoById(id: string): void
  destroy(): void
}

// ─── キュレーション済みトラック ────────────────────
const PRESET_TRACKS: Track[] = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl — Study Beats', flag: '📚' },
  { id: '5qap5aO4i9A', name: 'Lofi Girl — Sleep / Chill', flag: '🌙' },
  { id: 'DWcJFNfaw9c', name: 'Coffee Shop Radio', flag: '☕' },
  { id: 'kgx4WGK0oNU', name: 'Chillhop Radio', flag: '🐾' },
  { id: '7NOSDKb0HlU', name: 'Studio Ghibli Piano', flag: '🌿' },
  { id: 'y1bXO_H_MBQ', name: '森の鳥の声', flag: '🐦' },
  { id: 'xNN7iTA57jM', name: '雨と鳥の声', flag: '🌧️' },
]

// ─── YouTube URL からビデオIDを抽出 ───────────────
function extractVideoId(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/(?:live|embed|shorts)\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pat of patterns) {
    const m = s.match(pat)
    if (m) return m[1]
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  return null
}

// ─── YT IFrame API を1度だけロード ───────────────
let ytApiLoaded = false
function loadYTApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (ytApiLoaded) return new Promise(r => { window.onYouTubeIframeAPIReady = r })
  ytApiLoaded = true
  return new Promise(resolve => {
    window.onYouTubeIframeAPIReady = resolve
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
}

const BAR_COUNT = 16

// ─── コンポーネント ───────────────────────────────
export default function BGMPlayer() {
  const [apiReady, setApiReady] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlErr, setUrlErr] = useState('')
  const [isOpen, setIsOpen] = useState(false)   // プレイヤーが展開しているか
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(70)
  const [nowPlaying, setNowPlaying] = useState<Track | null>(null)
  const [waveBars, setWaveBars] = useState<number[]>(Array(BAR_COUNT).fill(0))

  const playerRef = useRef<YTPlayer | null>(null)
  const waveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // YT API の非同期ロード
  useEffect(() => {
    loadYTApi().then(() => setApiReady(true))
    return () => {
      if (waveTimer.current) clearInterval(waveTimer.current)
      playerRef.current?.destroy()
    }
  }, [])

  // ─── 波形アニメーション ──────────────────────────
  const startWave = () => {
    waveTimer.current = setInterval(() => {
      setWaveBars(Array.from({ length: BAR_COUNT }, () => Math.random()))
    }, 120)
  }
  const stopWave = () => {
    if (waveTimer.current) clearInterval(waveTimer.current)
    setWaveBars(Array(BAR_COUNT).fill(0))
  }

  // ─── プレイヤー初期化してビデオをロード ────────
  const startVideo = useCallback((videoId: string, track: Track) => {
    if (!window.YT?.Player) return

    if (playerRef.current) {
      // 既存プレイヤーに新しいビデオをロード
      playerRef.current.loadVideoById(videoId)
      playerRef.current.setVolume(volume)
    } else {
      // 初回: プレイヤーを生成
      playerRef.current = new window.YT.Player('yt-bgm-player', {
        height: '1', width: '1', videoId,
        playerVars: {
          autoplay: 1, loop: 1, playlist: videoId,
          controls: 0, modestbranding: 1, rel: 0,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.setVolume(volume)
            e.target.playVideo()
          },
          onStateChange: (e: { data: number }) => {
            // 再生中: 1, 一時停止: 2
            if (e.data === 1) { setIsPlaying(true); startWave() }
            if (e.data === 2) { setIsPlaying(false); stopWave() }
          },
        },
      })
    }

    setNowPlaying(track)
    setIsOpen(true)
    setIsPlaying(true)
    startWave()
  }, [volume])

  // ─── URL 入力 → 再生 ─────────────────────────────
  const handlePlay = useCallback(() => {
    if (!apiReady) return
    const id = extractVideoId(urlInput)
    if (!id) { setUrlErr('有効なYouTube URLを入力してください'); return }
    setUrlErr('')
    const track: Track = {
      id,
      name: urlInput.length > 40 ? urlInput.slice(0, 40) + '…' : urlInput,
      flag: '🔗',
    }
    setUrlInput('')
    startVideo(id, track)
  }, [apiReady, urlInput, startVideo])

  // ─── プリセットから選択 ───────────────────────────
  const handlePreset = useCallback((track: Track) => {
    if (!apiReady) return
    startVideo(track.id, track)
  }, [apiReady, startVideo])

  // ─── 一時停止 / 再開 ──────────────────────────────
  const handlePauseResume = useCallback(() => {
    if (!playerRef.current) return
    if (isPlaying) {
      playerRef.current.pauseVideo()
      stopWave()
      setIsPlaying(false)
    } else {
      playerRef.current.playVideo()
      startWave()
      setIsPlaying(true)
    }
  }, [isPlaying])

  // ─── 閉じる（停止 + 折りたたむ） ────────────────
  const handleClose = useCallback(() => {
    playerRef.current?.stopVideo()
    stopWave()
    setIsPlaying(false)
    setIsOpen(false)
    setNowPlaying(null)
  }, [])

  // ─── 音量変更 ────────────────────────────────────
  const handleVolume = (v: number) => {
    setVolume(v)
    playerRef.current?.setVolume(v)
  }

  return (
    <div className={styles.bgmPlayer}>
      {/* 非表示 YouTube プレイヤー DOM */}
      <div className={styles.hiddenPlayer} aria-hidden>
        <div id="yt-bgm-player" />
      </div>

      {/* ─── URL入力エリア（常に表示） ─── */}
      <div className={styles.inputArea}>
        <p className={styles.inputLabel}>🎵 YouTube BGM</p>
        <div className={styles.inputRow}>
          <input
            type="text"
            className={styles.urlInput}
            placeholder="YouTube URLを貼り付けて再生..."
            value={urlInput}
            onChange={e => { setUrlInput(e.target.value); setUrlErr('') }}
            onKeyDown={e => { if (e.key === 'Enter') handlePlay() }}
          />
          <button
            className={styles.playStartBtn}
            onClick={handlePlay}
            disabled={!apiReady || !urlInput.trim()}
            title="再生"
          >
            ▶
          </button>
        </div>
        {urlErr && <p className={styles.urlErr}>⚠️ {urlErr}</p>}

        {/* プリセットボタンリスト */}
        <div className={styles.presets} style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>⭐ おすすめBGM</p>
          {PRESET_TRACKS.map(t => (
            <button
              key={t.id}
              className={`${styles.presetBtn} ${nowPlaying?.id === t.id ? styles.presetActive : ''}`}
              onClick={() => handlePreset(t)}
              title={t.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: nowPlaying?.id === t.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                fontSize: '0.82rem', color: nowPlaying?.id === t.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s', width: '100%', textAlign: 'left',
                boxShadow: nowPlaying?.id === t.id ? '0 4px 12px rgba(124, 58, 237, 0.3)' : 'none'
              }}
              onMouseEnter={e => {
                if (nowPlaying?.id !== t.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (nowPlaying?.id !== t.id) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <div style={{
                background: nowPlaying?.id === t.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', flexShrink: 0
              }}>
                <span style={{ filter: nowPlaying?.id === t.id ? 'none' : 'grayscale(0.8)' }}>{t.flag}</span>
              </div>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: nowPlaying?.id === t.id ? 700 : 500 }}>
                {t.name}
              </span>
              {nowPlaying?.id === t.id && (
                <span style={{ fontSize: '0.8rem', animation: 'playing-pulse 1s infinite alternate' }}>🎵</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ─── プレイヤーパネル（再生中のみ展開） ─── */}
      <div className={`${styles.playerPanel} ${isOpen ? styles.playerPanelOpen : ''}`}>
        {isOpen && nowPlaying && (
          <>
            {/* 波形バー */}
            <div className={styles.waveform}>
              {waveBars.map((v, i) => (
                <div key={i}
                  className={`${styles.waveBar} ${isPlaying ? styles.waveBarActive : ''}`}
                  style={{ height: `${15 + v * 85}%`, animationDuration: `${0.4 + (i % 5) * 0.1}s` }}
                />
              ))}
            </div>

            {/* NOW PLAYING バー */}
            <div className={styles.nowPlayingBar}>
              <span className={styles.nowPlayingFlag}>{nowPlaying.flag}</span>
              <span className={styles.nowPlayingName}>{nowPlaying.name}</span>

              <div className={styles.controls}>
                {/* 一時停止 / 再開 */}
                <button
                  className={styles.controlBtn}
                  onClick={handlePauseResume}
                  title={isPlaying ? '一時停止' : '再開'}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>

                {/* 音量スライダー */}
                <input
                  type="range" min={0} max={100} value={volume}
                  className={styles.volSlider}
                  style={{ '--pct': `${volume}%` } as React.CSSProperties}
                  onChange={e => handleVolume(Number(e.target.value))}
                  title={`音量: ${volume}%`}
                />

                {/* 閉じる（停止）ボタン */}
                <button
                  className={styles.closeBtn}
                  onClick={handleClose}
                  title="BGMを停止して閉じる"
                >
                  ⏹
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
