'use client'
// BGMミキサー（ルーム内専用）
// YouTube IFrame Player で Lofi + 自然音を2系統ミックス再生。
// YouTube URLを貼り付けるだけで再生 — APIキー不要・完全無料。
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './BGMPlayer.module.css'

// ─── 型定義 ────────────────────────────────────────
interface Track { id: string; name: string; sub: string; flag: string }

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
  setVolume(v: number): void
  loadVideoById(id: string): void
  destroy(): void
}

// ─── キュレーション済みデフォルト ─────────────────
const LOFI_TRACKS: Track[] = [
  { id: 'jfKfPfyJRdk', name: 'Lofi Girl — Study Beats',   sub: '24/7 ライブ',   flag: '📚' },
  { id: '5qap5aO4i9A', name: 'Lofi Girl — Sleep / Chill', sub: 'まったりモード', flag: '🌙' },
  { id: 'DWcJFNfaw9c', name: 'Coffee Shop Radio',          sub: 'カフェBGM',     flag: '☕' },
  { id: 'kgx4WGK0oNU', name: 'Chillhop Radio',             sub: 'Jazzy Lofi',    flag: '🐾' },
  { id: '7NOSDKb0HlU', name: 'Studio Ghibli Piano',        sub: 'ジブリBGM',     flag: '🌿' },
]

const NATURE_TRACKS: Track[] = [
  { id: 'y1bXO_H_MBQ', name: '森の鳥の声',        sub: '朝の森アンビエント', flag: '🐦' },
  { id: 'xNN7iTA57jM', name: '雨と鳥の声',        sub: 'レインフォレスト',   flag: '🌧️' },
  { id: 'eKFTSSKCzWA', name: '川のせせらぎ + 鳥', sub: '自然のサウンド',     flag: '🏞️' },
  { id: 'lFcSrYw2tYU', name: '海辺の鳥の声',      sub: 'オーシャンアンビ',   flag: '🌊' },
]

const BAR_COUNT = 18

// ─── YouTube URL / ID からビデオIDを抽出 ─────────
// 対応フォーマット:
//   https://www.youtube.com/watch?v=XXXX
//   https://youtu.be/XXXX
//   https://www.youtube.com/live/XXXX
//   https://www.youtube.com/embed/XXXX
//   https://www.youtube.com/shorts/XXXX
//   XXXXXXXXXXX（11文字のIDをそのまま）
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

// ─── YT IFrame API をページに一度だけロード ───────
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

// ─── コンポーネント ───────────────────────────────
export default function BGMPlayer() {
  const [isPlaying,  setIsPlaying]  = useState(false)
  const [apiReady,   setApiReady]   = useState(false)
  const [lofiTrack,  setLofiTrack]  = useState(LOFI_TRACKS[0])
  const [natureTrack,setNatureTrack]= useState(NATURE_TRACKS[0])
  const [lofiVol,    setLofiVol]    = useState(65)
  const [natureVol,  setNatureVol]  = useState(45)

  // URL入力フィールド
  const [lofiUrl,    setLofiUrl]    = useState('')
  const [lofiErr,    setLofiErr]    = useState('')
  const [natureUrl,  setNatureUrl]  = useState('')
  const [natureErr,  setNatureErr]  = useState('')

  // 波形バー
  const [waveBars, setWaveBars] = useState<number[]>(Array(BAR_COUNT).fill(0))

  const lofiPlayerRef   = useRef<YTPlayer | null>(null)
  const naturePlayerRef = useRef<YTPlayer | null>(null)
  const waveTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadYTApi().then(() => setApiReady(true))
    return () => {
      if (waveTimerRef.current) clearInterval(waveTimerRef.current)
      lofiPlayerRef.current?.destroy()
      naturePlayerRef.current?.destroy()
    }
  }, [])

  // ─── プレイヤー初期化 ────────────────────────────
  const initPlayers = useCallback((lofiId: string, natureId: string) => {
    if (!window.YT?.Player) return
    lofiPlayerRef.current = new window.YT.Player('yt-lofi-player', {
      height: '1', width: '1', videoId: lofiId,
      playerVars: { autoplay: 1, loop: 1, playlist: lofiId, controls: 0, modestbranding: 1 },
      events: { onReady: (e: { target: YTPlayer }) => { e.target.setVolume(lofiVol); e.target.playVideo() } },
    })
    naturePlayerRef.current = new window.YT.Player('yt-nature-player', {
      height: '1', width: '1', videoId: natureId,
      playerVars: { autoplay: 1, loop: 1, playlist: natureId, controls: 0, modestbranding: 1 },
      events: { onReady: (e: { target: YTPlayer }) => { e.target.setVolume(natureVol); e.target.playVideo() } },
    })
  }, [lofiVol, natureVol])

  // ─── 波形アニメ ────────────────────────────────
  const startWave = () => {
    waveTimerRef.current = setInterval(() => {
      setWaveBars(Array.from({ length: BAR_COUNT }, () => Math.random()))
    }, 110)
  }
  const stopWave = () => {
    if (waveTimerRef.current) clearInterval(waveTimerRef.current)
    setWaveBars(Array(BAR_COUNT).fill(0))
  }

  // ─── 再生 / 停止トグル ──────────────────────────
  const handleToggle = useCallback(() => {
    if (!apiReady) return
    if (isPlaying) {
      lofiPlayerRef.current?.pauseVideo()
      naturePlayerRef.current?.pauseVideo()
      stopWave()
      setIsPlaying(false)
    } else {
      if (!lofiPlayerRef.current) {
        initPlayers(lofiTrack.id, natureTrack.id)
      } else {
        lofiPlayerRef.current.playVideo()
        naturePlayerRef.current?.playVideo()
      }
      startWave()
      setIsPlaying(true)
    }
  }, [apiReady, isPlaying, initPlayers, lofiTrack.id, natureTrack.id])

  // ─── URL貼り付け → トラック変更 ────────────────
  const applyUrl = useCallback((raw: string, type: 'lofi' | 'nature') => {
    const id = extractVideoId(raw)
    if (!id) {
      if (type === 'lofi') setLofiErr('有効なYouTube URLを入力してください')
      else                 setNatureErr('有効なYouTube URLを入力してください')
      return
    }
    const track: Track = { id, name: raw.length > 36 ? raw.slice(0, 36) + '…' : raw, sub: 'カスタムURL', flag: '🔗' }
    if (type === 'lofi') {
      setLofiErr(''); setLofiTrack(track); setLofiUrl('')
      if (lofiPlayerRef.current) { lofiPlayerRef.current.loadVideoById(id); lofiPlayerRef.current.setVolume(lofiVol) }
    } else {
      setNatureErr(''); setNatureTrack(track); setNatureUrl('')
      if (naturePlayerRef.current) { naturePlayerRef.current.loadVideoById(id); naturePlayerRef.current.setVolume(natureVol) }
    }
  }, [lofiVol, natureVol])

  // ─── キュレーション済みトラック選択 ─────────────
  const selectTrack = useCallback((track: Track, type: 'lofi' | 'nature') => {
    if (type === 'lofi') {
      setLofiTrack(track)
      lofiPlayerRef.current?.loadVideoById(track.id)
      lofiPlayerRef.current?.setVolume(lofiVol)
    } else {
      setNatureTrack(track)
      naturePlayerRef.current?.loadVideoById(track.id)
      naturePlayerRef.current?.setVolume(natureVol)
    }
  }, [lofiVol, natureVol])

  // 音量変更
  const handleLofiVol   = (v: number) => { setLofiVol(v);   lofiPlayerRef.current?.setVolume(v) }
  const handleNatureVol = (v: number) => { setNatureVol(v); naturePlayerRef.current?.setVolume(v) }

  return (
    <div className={styles.mixer}>
      {/* 非表示 YouTube プレイヤー */}
      <div className={styles.hiddenPlayers} aria-hidden>
        <div id="yt-lofi-player" />
        <div id="yt-nature-player" />
      </div>

      {/* ─── 波形 + 再生ボタン ─── */}
      <div className={styles.visualHeader}>
        <div className={styles.waveform}>
          {waveBars.map((v, i) => (
            <div key={i}
              className={`${styles.waveBar} ${isPlaying ? styles.active : ''}`}
              style={{ height: isPlaying ? `${15 + v * 85}%` : '15%', '--spd': `${0.35 + (i % 5) * 0.1}s` } as React.CSSProperties}
            />
          ))}
        </div>
        <div className={styles.nowPlaying}>
          <div className={`${styles.nowPlayingDot} ${!isPlaying ? styles.paused : ''}`} />
          <div className={styles.nowPlayingInfo}>
            <p className={styles.nowPlayingTitle}>{lofiTrack.flag} {lofiTrack.name}</p>
            <p className={styles.nowPlayingLabel}>{isPlaying ? '▶ Lo-fi + 自然音ミックス中' : '⏸ 停止中'}</p>
          </div>
          <button
            className={`${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
            onClick={handleToggle} disabled={!apiReady}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {/* ─── 音量スライダー ─── */}
      <div className={styles.mixerSliders}>
        <div className={styles.sliderRow}>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>🎹 Lo-fi</span>
            <span className={styles.sliderVal}>{lofiVol}%</span>
          </div>
          <input type="range" min={0} max={100} value={lofiVol}
            className={`${styles.slider} ${styles.sliderLofi}`}
            style={{ '--pct': `${lofiVol}%` } as React.CSSProperties}
            onChange={e => handleLofiVol(Number(e.target.value))} />
        </div>
        <div className={styles.sliderRow}>
          <div className={styles.sliderHeader}>
            <span className={styles.sliderLabel}>🐦 自然音</span>
            <span className={styles.sliderVal}>{natureVol}%</span>
          </div>
          <input type="range" min={0} max={100} value={natureVol}
            className={`${styles.slider} ${styles.sliderBird}`}
            style={{ '--pct': `${natureVol}%` } as React.CSSProperties}
            onChange={e => handleNatureVol(Number(e.target.value))} />
        </div>
      </div>

      {/* ─── スクロールエリア ─── */}
      <div className={styles.scrollArea}>

        {/* Lo-fi URL入力 */}
        <div className={styles.inputPanel}>
          <p className={styles.inputPanelLabel}>🎹 カスタムLo-fi URL</p>
          <div className={styles.urlRow}>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={lofiUrl}
              onChange={e => { setLofiUrl(e.target.value); setLofiErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') applyUrl(lofiUrl, 'lofi') }}
              className={styles.urlInput}
            />
            <button className={styles.urlBtn} onClick={() => applyUrl(lofiUrl, 'lofi')} title="セット">▶</button>
          </div>
          {lofiErr && <p className={styles.urlErr}>⚠️ {lofiErr}</p>}
        </div>

        {/* Lo-fi トラック一覧 */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>🎵 おすすめ Lo-fi</p>
          <div className={styles.trackList}>
            {LOFI_TRACKS.map(t => (
              <div key={t.id}
                className={`${styles.trackItem} ${lofiTrack.id === t.id ? styles.selected : ''}`}
                onClick={() => selectTrack(t, 'lofi')}
              >
                <span className={styles.trackPlayingIcon}>{lofiTrack.id === t.id && isPlaying ? '🎵' : ''}</span>
                <span className={styles.trackFlag}>{t.flag}</span>
                <div className={styles.trackInfo}>
                  <p className={styles.trackName}>{t.name}</p>
                  <p className={styles.trackSub}>{t.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 自然音 URL入力 */}
        <div className={styles.inputPanel}>
          <p className={styles.inputPanelLabel}>🌿 カスタム自然音 URL</p>
          <div className={styles.urlRow}>
            <input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={natureUrl}
              onChange={e => { setNatureUrl(e.target.value); setNatureErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') applyUrl(natureUrl, 'nature') }}
              className={styles.urlInput}
            />
            <button className={styles.urlBtn} onClick={() => applyUrl(natureUrl, 'nature')} title="セット">▶</button>
          </div>
          {natureErr && <p className={styles.urlErr}>⚠️ {natureErr}</p>}
        </div>

        {/* 自然音トラック一覧 */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>🌿 おすすめ自然音</p>
          <div className={styles.trackList}>
            {NATURE_TRACKS.map(t => (
              <div key={t.id}
                className={`${styles.trackItem} ${natureTrack.id === t.id ? styles.selected : ''}`}
                onClick={() => selectTrack(t, 'nature')}
              >
                <span className={styles.trackPlayingIcon}>{natureTrack.id === t.id && isPlaying ? '🎵' : ''}</span>
                <span className={styles.trackFlag}>{t.flag}</span>
                <div className={styles.trackInfo}>
                  <p className={styles.trackName}>{t.name}</p>
                  <p className={styles.trackSub}>{t.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
