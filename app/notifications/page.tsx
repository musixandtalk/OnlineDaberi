// 通知ページ
import PlaceholderPage from '@/components/PlaceholderPage/PlaceholderPage'

export default function NotificationsPage() {
    return (
        <PlaceholderPage
            icon="🔔"
            title="通知"
            description="フォロー中のユーザーやクラブからのお知らせ、部屋への招待などの通知が届きます。"
            links={[{ label: '← ホームへ戻る', href: '/' }]}
        />
    )
}
