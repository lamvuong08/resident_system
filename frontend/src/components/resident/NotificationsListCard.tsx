import { Button, Card, Empty, Skeleton, Typography } from 'antd'
import type { DashboardNotification } from '../../types/residentDashboard'
import { formatNotificationDate } from '../../utils/notificationApi'
import '../../styles/resident-notifications.css'

type NotificationsListCardProps = {
  loading: boolean
  items: DashboardNotification[]
  onViewAll: () => void
  onItemClick?: (id: string, isRead: boolean) => void
}

const truncateContent = (value: string, maxLength = 100) =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value

const NotificationsListCard = ({ loading, items, onViewAll, onItemClick }: NotificationsListCardProps) => {
  const latestItems = items.slice(0, 5)

  return (
    <Card
      className="resident-dashboard__card resident-dashboard__card--padded-extra"
      title="Thông báo quan trọng"
      extra={<Button className="resident-btn resident-btn--outline" onClick={onViewAll}>Xem tất cả</Button>}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : latestItems.length === 0 ? (
        <div className="resident-card-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo mới" />
        </div>
      ) : (
        <div className="resident-notifications-list">
          {latestItems.map((item) => (
            <button
              key={item.id}
              className={`resident-notifications-item ${item.isRead ? 'read' : 'unread'}`}
              type="button"
              style={{ width: '100%', textAlign: 'left', minWidth: 0 }}
              onClick={() => onItemClick?.(item.id, item.isRead)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <Typography.Text className="resident-notifications-item__title" strong style={{ flex: 1, paddingRight: 8, wordBreak: 'break-word', textAlign: 'left' }}>
                  {item.title}
                </Typography.Text>
                <Typography.Text className="resident-notifications-item__time" type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12, marginTop: 0, flexShrink: 0 }}>
                  {formatNotificationDate(item.createdAt)}
                </Typography.Text>
              </div>
              {item.content && (
                <Typography.Text className="resident-notifications-item__content" type="secondary" style={{ display: 'block' }}>
                  {truncateContent(item.content)}
                </Typography.Text>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

export default NotificationsListCard
