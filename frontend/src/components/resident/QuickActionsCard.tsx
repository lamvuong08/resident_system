import { Button, Card } from 'antd'
import { BellOutlined, CreditCardOutlined, FileTextOutlined } from '@ant-design/icons'

type QuickActionsCardProps = {
  onCreateRequest: () => void
  onPayNow: () => void
  onViewNotifications: () => void
}

const QuickActionsCard = ({ onCreateRequest, onPayNow, onViewNotifications }: QuickActionsCardProps) => {
  return (
    <Card className="resident-dashboard__card" title="Shortcut nhanh">
      <div className="resident-quick-actions">
        <Button className="resident-btn resident-btn--outline" icon={<FileTextOutlined />} onClick={onCreateRequest}>Gửi yêu cầu</Button>
        <Button className="resident-btn resident-btn--outline" icon={<CreditCardOutlined />} onClick={onPayNow}>Thanh toán</Button>
        <Button className="resident-btn resident-btn--outline" icon={<BellOutlined />} onClick={onViewNotifications}>Xem thông báo</Button>
      </div>
    </Card>
  )
}

export default QuickActionsCard
