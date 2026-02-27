// クラブ詳細ページ（動的ルート）
import PlaceholderPage from '@/components/PlaceholderPage/PlaceholderPage'

interface Props {
    params: Promise<{ slug: string }>
}

export default async function ClubPage({ params }: Props) {
    const { slug } = await params
    return (
        <PlaceholderPage
            icon="🏛️"
            title={`クラブ: ${slug}`}
            description="クラブのメンバー一覧・過去の部屋・スケジュール・説明などを確認できるページです。"
            links={[
                { label: '🏛️ クラブ一覧へ', href: '/clubs' },
                { label: '← ホームへ戻る', href: '/' },
            ]}
        />
    )
}
