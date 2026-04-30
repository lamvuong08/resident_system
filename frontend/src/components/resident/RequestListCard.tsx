import { Card, Empty, Skeleton, Tag } from 'antd'
import type { DashboardRequest } from '../../types/residentDashboard'

type RequestListCardProps = {
  loading: boolean
  items: DashboardRequest[]
}

const formatStatus = (status: string) => {
  if (status === 'DONE' || status === 'COMPLETED') return { text: 'Hoàn thành', color: 'success' as const }
  if (status === 'IN_PROGRESS' || status === 'PROCESSING') return { text: 'Đang xử lý', color: 'processing' as const }
  return { text: 'Chờ xử lý', color: 'warning' as const }
}

const RequestListCard = ({ loading, items }: RequestListCardProps) => {
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

            return (
              <div className="resident-list-item" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.content}</p>
                </div>
                <Tag color={status.color}>{status.text}</Tag>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default RequestListCard
