import { Card, Empty, Skeleton, Tag } from 'antd'
import type { DashboardRequest } from '../../types/residentDashboard'
import { formatUserRequestDate } from '../../utils/userSupportApi'

type RequestListCardProps = {
  loading: boolean
  items: DashboardRequest[]
  onItemClick?: (id: string) => void
}

const formatStatus = (status: string) => {
  if (status === 'DONE' || status === 'COMPLETED' || status === 'APPROVED') return { text: 'Hoàn thành', color: 'success' as const }
  if (status === 'IN_PROGRESS' || status === 'PROCESSING') return { text: 'Đang xử lý', color: 'processing' as const }
  if (status === 'REJECTED' || status === 'DENIED') return { text: 'Từ chối', color: 'error' as const }
  if (status === 'PENDING') return { text: 'Chờ xử lý', color: 'warning' as const }
  return { text: 'Chờ xử lý', color: 'warning' as const }
}

const RequestListCard = ({ loading, items, onItemClick }: RequestListCardProps) => {
  const latestItems = items.slice(0, 5)

  return (
    <Card className="resident-dashboard__card" title="Yêu cầu gần đây">
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : latestItems.length === 0 ? (
        <div className="resident-card-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bạn chưa gửi yêu cầu nào" />
        </div>
      ) : (
        <div className="resident-list">
          {latestItems.map((item) => {
            const status = formatStatus(item.status)
            const dateStr = formatUserRequestDate(item.createdAt)

            return (
              <div
                className={`resident-list-item ${onItemClick ? 'resident-list-item--clickable' : ''}`}
                key={item.id}
                onClick={() => onItemClick?.(item.id)}
              >
                <div className="text-start" style={{ flex: 1 }}>
                  <div className="fw-semibold" style={{ color: '#10233d', fontSize: '15px' }}>{item.title}</div>
                  <div className="text-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                    {dateStr !== '—' ? dateStr : item.content}
                  </div>
                </div>
                <div className="text-end" style={{ flexShrink: 0 }}>
                  <Tag color={status.color} style={{ marginRight: 0 }}>
                    {status.text}
                  </Tag>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default RequestListCard
