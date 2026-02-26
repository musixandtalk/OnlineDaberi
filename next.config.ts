import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 外部ドメインの画像を許可（Firebase Storage・Googleアバター等）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // Turbopack 設定（Next.js 16でデフォルト）
  turbopack: {},
}

export default nextConfig
