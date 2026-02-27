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

    return (
        <div className={styles.wrapper} ref={menuRef}>
            {/* マイクボタン本体（親から渡される） */}
            {children}

            {/* デバイス選択を開く矢印ボタン */}
            <button
                className={styles.arrowBtn}
                onClick={() => setMenuOpen(prev => !prev)}
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
                        <p className={styles.noDevices}>マイクが見つかりません</p>
                    ) : (
                        devices.map(device => {
                            const isActive = device.deviceId === activeDeviceId
                            return (
                                <button
                                    key={device.deviceId}
                                    className={`${styles.menuItem} ${isActive ? styles.menuItemActive : ''}`}
                                    onClick={async () => {
                                        await setActiveMediaDevice(device.deviceId)
                                        setMenuOpen(false)
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
                        })
                    )}
                </div>
            )}
        </div>
    )
}
