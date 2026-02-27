// トレンドページ
import PlaceholderPage from '@/components/PlaceholderPage/PlaceholderPage'

export default function TrendingPage() {
    return (
        <PlaceholderPage
            icon="🔥"
            title="トレンド"
            description="今話題の部屋・クラブ・ユーザーをまとめて見られるページです。人気の会話をリアルタイムでチェックできます。"
            links={[{ label: '← ホームへ戻る', href: '/' }]}
        />
    )
}
