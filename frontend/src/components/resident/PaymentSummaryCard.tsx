import { Button, Card, Empty, Skeleton, Tag } from 'antd'
import type { DashboardPayment } from '../../types/residentDashboard'
import { formatBillingPeriod } from '../../utils/residentDashboard'

type PaymentSummaryCardProps = {
  loading: boolean
  items: DashboardPayment[]
  totalUnpaidAmount: number
  onPayNow: () => void
  showAll?: boolean
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

const PaymentSummaryCard = ({ loading, items, totalUnpaidAmount, onPayNow, showAll }: PaymentSummaryCardProps) => {
  const displayItems = showAll ? items : items.slice(0, 5)

  return (
    <Card
      className="resident-dashboard__card resident-dashboard__card--padded-extra"
      title="Khoản cần thanh toán"
      extra={<Button type="primary" className="resident-btn resident-btn--primary" onClick={onPayNow}>Thanh toán ngay</Button>}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : displayItems.length === 0 ? (
        <div className="resident-card-empty">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có hóa đơn gần đây" />
        </div>
      ) : (
        <>
          <div className="resident-list">
            {displayItems.map((item) => {
              const status = formatStatus(item.status)
              const billingPeriod = formatBillingPeriod(item.billingMonth, item.billingYear)

              return (
                <div className="resident-list-item" key={item.id}>
                  <div className="text-start">
                    <div className="fw-semibold" style={{ color: '#10233d', fontSize: '15px' }}>{item.title}</div>
                    {billingPeriod && (
                      <small className="text-muted" style={{ display: 'block', marginTop: '2px' }}>
                        {billingPeriod}
                      </small>
                    )}
                  </div>
                  <div className="text-end" style={{ flexShrink: 0 }}>
                    <div className="fw-bold" style={{ fontSize: '16px', color: '#10233d', marginBottom: '4px' }}>
                      {formatCurrency(item.amount)}
                    </div>
                    <Tag color={status.color} style={{ marginRight: 0 }}>{status.text}</Tag>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="resident-summary-row">
            <span className="text-start">Tổng tiền cần thanh toán</span>
            <strong className="text-end" style={{ fontSize: '18px', color: '#cf1322' }}>
              {formatCurrency(totalUnpaidAmount)}
            </strong>
          </div>
        </>
      )}
    </Card>
  )
}

export default PaymentSummaryCard
