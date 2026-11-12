import dayjs from 'dayjs'
import type { UserAggregatedBill } from '../types/residentDashboard'

export const paymentMoney = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(value)

export const paymentDate = (value?: string | null, withTime = false) =>
  value && dayjs(value).isValid() ? dayjs(value).format(withTime ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY') : 'Chưa có thông tin'

// Presentation of backend status only: never derive debt/payment status from browser dates.
export function paymentStatus(status: string) {
  if (['Đã thanh toán', 'PAID'].includes(status)) return 'paid'
  if (['Quá hạn', 'OVERDUE'].includes(status)) return 'overdue'
  return 'unpaid'
}

function periodOrder(period: string) {
  const parts = period.includes('/') ? period.split('/').reverse() : period.split('-')
  return Number(parts[0]) * 12 + Number(parts[1]) || 0
}

export function sortResidentBills(bills: UserAggregatedBill[]) {
  const priority = { overdue: 0, unpaid: 1, paid: 2 }
  return [...bills].sort((a, b) => priority[paymentStatus(a.status)] - priority[paymentStatus(b.status)]
    || periodOrder(b.billingMonth) - periodOrder(a.billingMonth) || b.id - a.id)
}

export function paymentQrErrorMessage(error: unknown) {
  const status = (error as { response?: { status?: number } }).response?.status
  if (status === 503) return 'Phương thức thanh toán QR hiện chưa khả dụng. Vui lòng thử lại sau hoặc liên hệ ban quản lý.'
  if (status === 403 || status === 404) return 'Không thể mở thanh toán cho hóa đơn này. Vui lòng tải lại hóa đơn hoặc liên hệ ban quản lý.'
  if (status === 409) return 'Hóa đơn hiện chưa thể thanh toán bằng QR. Vui lòng kiểm tra lại hoặc liên hệ ban quản lý.'
  return 'Chưa thể kết nối để kiểm tra thanh toán. Vui lòng kiểm tra kết nối mạng và thử lại.'
}
