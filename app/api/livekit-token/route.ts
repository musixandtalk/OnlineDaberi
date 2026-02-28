// LiveKit トークン発行 API
// role パラメーターで「host/moderator/speaker」→ canPublish=true
//                       「listener」           → canPublish=false
import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const room = searchParams.get('room')
    const username = searchParams.get('username')
    const role = searchParams.get('role') ?? 'listener'  // デフォルトはリスナー

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

    // ロールに応じて送信権限を決定
    // host / moderator / speaker → マイク送信可
    // listener                   → 受信のみ（マイク送信不可）
    const canPublish = ['host', 'moderator', 'speaker'].includes(role)

    // アクセストークンを生成
    const at = new AccessToken(apiKey, apiSecret, {
        identity: username,
        name: username,
        ttl: '2h',
    })

    at.addGrant({
        roomJoin: true,
        room: room,
        canPublish,          // ロールによって true/false
        canSubscribe: true,  // 全員が他の人の音声を聞ける
        canPublishData: true, // データチャンネル（チャット等）は全員可
    })

    const token = await at.toJwt()
    return NextResponse.json({ token, role, canPublish })
}
