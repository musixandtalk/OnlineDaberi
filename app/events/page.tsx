// イベントページ
import PlaceholderPage from '@/components/PlaceholderPage/PlaceholderPage'

export default function EventsPage() {
    return (
        <PlaceholderPage
            icon="📅"
            title="イベント"
            description="予定されているだべりイベントをカレンダーで確認・参加予約ができるページです。"
            links={[{ label: '← ホームへ戻る', href: '/' }]}
        />
    )
}
