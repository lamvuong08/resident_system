import { useEffect, useState } from 'react'
import { Alert } from 'antd'
import PaymentSummaryCard from '../../components/resident/PaymentSummaryCard'
import { getResidentPayments } from '../../utils/residentDashboard'
import type { DashboardPayment } from '../../types/residentDashboard'
import '../../styles/resident-dashboard.css'

const PAYMENT_UNPAID_STATUSES = new Set(['UNPAID', 'PENDING', 'DUE', 'UNPAID_INVOICE'])

const Payment = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payments, setPayments] = useState<DashboardPayment[]>([])

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getResidentPayments()
        if (mounted) {
          setPayments(data)
        }
      } catch {
        if (mounted) {
          setError('Không thể tải danh sách thanh toán.')
          setPayments([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [])

  const totalUnpaidAmount = payments
    .filter((item) => PAYMENT_UNPAID_STATUSES.has(item.status))
    .reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="resident-page">
      <h2>Thanh toán</h2>
      {error && <Alert type="warning" showIcon message={error} />}
      <PaymentSummaryCard
        loading={loading}
        items={payments}
        totalUnpaidAmount={totalUnpaidAmount}
        onPayNow={() => {}}
      />
    </div>
  )
}

export default Payment
