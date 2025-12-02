import { Header } from './Header'
import { getNotificationData } from '@/app/actions/notifications'

export async function HeaderWrapper() {
  const { notifications, unreadCount } = await getNotificationData()

  return <Header notifications={notifications} unreadCount={unreadCount} />
}
