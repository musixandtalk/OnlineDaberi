// クラブ一覧ページ
import PlaceholderPage from '@/components/PlaceholderPage/PlaceholderPage'

export default function ClubsPage() {
    return (
        <PlaceholderPage
            icon="🏛️"
            title="クラブを探す"
            description="趣味や話題別のクラブを探して参加できるページです。自分でクラブを作ることもできます。"
            links={[{ label: '← ホームへ戻る', href: '/' }]}
        />
    )
}
