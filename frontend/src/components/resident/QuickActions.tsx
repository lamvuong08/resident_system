import { Button } from 'antd'
import { BellOutlined, CreditCardOutlined, FileTextOutlined } from '@ant-design/icons'

type QuickActionsProps = {
  onCreateRequest: () => void
  onPayNow: () => void
  onViewNotifications: () => void
}

const QuickActions = ({ onCreateRequest, onPayNow, onViewNotifications }: QuickActionsProps) => {
  return (
    <div className="resident-quick-actions-bar">
      <Button className="resident-btn resident-btn--outline" icon={<FileTextOutlined />} onClick={onCreateRequest}>Gửi yêu cầu</Button>
      <Button className="resident-btn resident-btn--outline" icon={<CreditCardOutlined />} onClick={onPayNow}>Thanh toán</Button>
      <Button className="resident-btn resident-btn--outline" icon={<BellOutlined />} onClick={onViewNotifications}>Xem thông báo</Button>
    </div>
  )
}

export default QuickActions
