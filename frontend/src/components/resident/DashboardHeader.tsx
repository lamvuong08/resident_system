import { Button } from 'antd'

type DashboardHeaderProps = {
  displayName: string
  unreadNotifications: number
  inProgressRequests: number
  onViewNotifications: () => void
  onCreateRequest: () => void
}

const DashboardHeader = ({
  displayName,
  unreadNotifications,
  inProgressRequests,
  onViewNotifications,
  onCreateRequest,
}: DashboardHeaderProps) => {
  return (
    <section className="resident-dashboard__hero">
      <h1>Chào mừng trở lại, {displayName}</h1>
      <p>
        Bạn có <strong>{unreadNotifications}</strong> thông báo chưa đọc và <strong>{inProgressRequests}</strong> yêu cầu đang được xử lý
      </p>
      <div className="resident-dashboard__hero-actions">
        <Button className="resident-btn resident-btn--outline" onClick={onViewNotifications}>Xem thông báo</Button>
        <Button type="primary" className="resident-btn resident-btn--primary" onClick={onCreateRequest}>Gửi yêu cầu mới</Button>
      </div>
    </section>
  )
}

export default DashboardHeader
