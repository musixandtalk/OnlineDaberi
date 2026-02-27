// LiveKit トークン発行 API
// ユーザーが部屋に入る際に、サーバー側で安全に認証トークンを生成して返す
import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const room = searchParams.get('room')
    const username = searchParams.get('username')

    // パラメーターチェック
    if (!room || !username) {
        return NextResponse.json(
            { error: 'room と username は必須です' },
            { status: 400 }
        )
    }

    // 環境変数チェック
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
        return NextResponse.json(
            { error: 'LiveKit の環境変数が設定されていません' },
            { status: 500 }
        )
    }

    // アクセストークンを生成
    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,       // ユーザーの識別子
        name: username,           // 表示名
        ttl: '1h',               // トークンの有効期限（1時間）
    })

    // 部屋への接続権限を付与（音声・映像の送受信を許可）
    at.addGrant({
        roomJoin: true,           // 部屋への参加を許可
        room: room,               // 接続先の部屋名
        canPublish: true,         // マイク音声の送信を許可
        canSubscribe: true,       // 他者の音声の受信を許可
    })

    const token = await at.toJwt()

    return NextResponse.json({ token })
}
