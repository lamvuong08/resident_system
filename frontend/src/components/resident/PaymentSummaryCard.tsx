import { Button, Card, Empty, Skeleton, Tag } from 'antd'
import type { DashboardPayment } from '../../types/residentDashboard'

type PaymentSummaryCardProps = {
  loading: boolean
  items: DashboardPayment[]
  totalUnpaidAmount: number
  onPayNow: () => void
}

const PAYMENT_UNPAID_STATUSES = new Set(['UNPAID', 'PENDING', 'DUE', 'UNPAID_INVOICE'])

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

const formatStatus = (status: string) => {
  if (PAYMENT_UNPAID_STATUSES.has(status)) {
    return { text: 'Chưa thanh toán', color: 'error' as const }
  }
  return { text: 'Đã thanh toán', color: 'success' as const }
}

const PaymentSummaryCard = ({ loading, items, totalUnpaidAmount, onPayNow }: PaymentSummaryCardProps) => {
  const latestItems = items.slice(0, 5)

  return (
    <Card
      className="resident-dashboard__card resident-dashboard__card--padded-extra"
      title="Khoản cần thanh toán"
      extra={<Button type="primary" className="resident-btn resident-btn--primary" onClick={onPayNow}>Thanh toán ngay</Button>}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : latestItems.length === 0 ? (
        <div className="resident-card-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hóa đơn gần đây" />
        </div>
      ) : (
        <>
          <div className="resident-list">
            {latestItems.map((item) => {
              const status = formatStatus(item.status)

              return (
                <div className="resident-list-item" key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.dueDate ? `Hạn: ${item.dueDate}` : 'Không có hạn thanh toán'}</p>
                  </div>
                  <div className="resident-list-item__right">
                    <strong>{formatCurrency(item.amount)}</strong>
                    <Tag color={status.color}>{status.text}</Tag>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="resident-summary-row">
            <span>Tổng tiền cần thanh toán</span>
            <strong>{formatCurrency(totalUnpaidAmount)}</strong>
          </div>
        </>
      )}
    </Card>
  )
}

export default PaymentSummaryCard
