import { Button, Card, Empty, Skeleton, Tag } from 'antd'
import type { DashboardNotification } from '../../types/residentDashboard'

type NotificationsListCardProps = {
  loading: boolean
  items: DashboardNotification[]
  onViewAll: () => void
}

const formatDate = (value: string | null) => {
  if (!value) return 'Chưa rõ thời gian'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const NotificationsListCard = ({ loading, items, onViewAll }: NotificationsListCardProps) => {
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
        <div className="resident-list">
          {latestItems.map((item) => (
            <div className="resident-list-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{formatDate(item.createdAt)}</p>
              </div>
              <Tag color={item.isRead ? 'default' : 'processing'}>{item.isRead ? 'Đã đọc' : 'Chưa đọc'}</Tag>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default NotificationsListCard
