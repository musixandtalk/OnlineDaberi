// ルートレイアウト — アプリ全体のHTML構造
import '@/app/globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'オンダベ (OnlineDaberi) — みんなでだべろう',
  description: 'オンラインだべり場。声でゆるくつながるソーシャルプラットフォーム。部屋を作って、気軽に話しかけてみよう。',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#090b14" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
