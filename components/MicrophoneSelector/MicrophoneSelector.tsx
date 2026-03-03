'use client'
// マイクデバイス選択コンポーネント
// LiveKit の useMediaDeviceSelect を利用して、使用するマイクを切り替える
import { useState, useEffect, useRef } from 'react'
import { useMediaDeviceSelect } from '@livekit/components-react'
import styles from './MicrophoneSelector.module.css'

interface Props {
    /** マイクボタン本体のレンダリング関数（選択中かどうかを渡す） */
    children: React.ReactNode
}

function MicTester({ activeDeviceId }: { activeDeviceId: string }) {
    const [volume, setVolume] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [isTesting, setIsTesting] = useState(false)

    useEffect(() => {
        if (!isTesting) {
            setVolume(0)
            return
        }

        let stream: MediaStream | null = null
        let audioContext: AudioContext | null = null
        let animationFrame: number

        const startListening = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: activeDeviceId ? { deviceId: { exact: activeDeviceId } } : true
                })
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
                audioContext = new AudioContextClass()
                const source = audioContext.createMediaStreamSource(stream)
                const analyser = audioContext.createAnalyser()
                analyser.fftSize = 256
                source.connect(analyser)

                const dataArray = new Uint8Array(analyser.frequencyBinCount)
                const updateVolume = () => {
                    analyser.getByteFrequencyData(dataArray)
                    let sum = 0
                    for (let i = 0; i < dataArray.length; i++) {
                        sum += dataArray[i]
                    }
                    const avg = sum / dataArray.length
                    setVolume(avg)
                    animationFrame = requestAnimationFrame(updateVolume)
                }
                updateVolume()
                setError(null)
            } catch (err: any) {
                console.error('MicTester err:', err)
                setError('アクセス拒否、またはデバイスが見つかりません。')
            }
        }

        startListening()

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame)
            if (stream) stream.getTracks().forEach(t => t.stop())
            if (audioContext && audioContext.state !== 'closed') audioContext.close()
        }
    }, [isTesting, activeDeviceId])

    return (
        <div className={styles.testerContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>マイクテスト</span>
                <button
                    className={styles.testToggleBtn}
                    onClick={(e) => { e.stopPropagation(); setIsTesting(!isTesting) }}
                >
                    {isTesting ? '⏹ 停止' : '▶ テスト開始'}
                </button>
            </div>
            {isTesting && error && <p className={styles.testError}>{error}</p>}
            {isTesting && !error && (
                <div className={styles.meterBg}>
                    <div className={styles.meterFg} style={{ width: `${Math.min(100, (volume / 128) * 100)}%` }} />
                </div>
            )}
        </div>
    )
}

export default function MicrophoneSelector({ children }: Props) {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // LiveKit が提供するデバイス一覧と切り替え関数
    const { devices, activeDeviceId, setActiveMediaDevice } =
        useMediaDeviceSelect({ kind: 'audioinput' })

    // メニューの外側をクリックしたら閉じる
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [menuOpen])

    // デバイス名を読みやすく整形する（例：長いIDを削る）
    const formatDeviceName = (label: string) => {
        if (!label) return 'デバイス名不明'
        // ブラウザの付ける余分な括弧部分（デバイスID）を削除
        return label.replace(/\s*\(.*?\)\s*$/, '').trim() || label
    }

    // デバイス許可リクエスト
    const handleRequestPermission = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(t => t.stop())
        } catch (err) {
            console.error('Permission request failed', err)
        }
    }

    return (
        <div className={styles.wrapper} ref={menuRef}>
            {/* マイクボタン本体（親から渡される） */}
            {children}

            {/* デバイス選択を開く矢印ボタン */}
            <button
                className={styles.arrowBtn}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(prev => !prev) }}
                title="マイクを選択"
                aria-label="マイクデバイスを選択"
            >
                {menuOpen ? '▼' : '▲'}
            </button>

            {/* ドロップアップメニュー */}
            {menuOpen && (
                <div className={styles.menu} role="listbox" aria-label="マイク選択">
                    <p className={styles.menuLabel}>🎙️ マイクを選択</p>
                    {devices.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '12px 8px' }}>
                            <p className={styles.noDevices}>マイクが見つかりません</p>
                            <button className={styles.testToggleBtn} onClick={handleRequestPermission}>
                                権限をリクエスト
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                            {devices.map(device => {
                                const isActive = device.deviceId === activeDeviceId
                                return (
                                    <button
                                        key={device.deviceId}
                                        className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                                        onClick={async (e) => {
                                            e.stopPropagation()
                                            await setActiveMediaDevice(device.deviceId)
                                        }}
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <span className={styles.checkIcon}>{isActive ? '✅' : ''}</span>
                                        <span className={styles.deviceName}>
                                            {formatDeviceName(device.label)}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* マイクテスト */}
                    <MicTester activeDeviceId={activeDeviceId} />
                </div>
            )}
        </div>
    )
}
