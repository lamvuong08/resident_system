import api from './api'
import { fetchUserRequestsForDashboard } from './userSupportApi'
import { fetchMyNotifications } from './notificationApi'
import type {
  DashboardNotification,
  DashboardPayment,
  DashboardRequest,
  HouseholdSummary,
  ResidentDashboardData,
} from '../types/residentDashboard'

const REQUEST_IN_PROGRESS_STATUSES = new Set(['IN_PROGRESS', 'PROCESSING', 'PENDING', 'DANG_XU_LY'])
const PAYMENT_UNPAID_STATUSES = new Set(['UNPAID', 'PENDING', 'DUE', 'UNPAID_INVOICE'])

const toArray = (input: unknown): unknown[] => {
  if (Array.isArray(input)) {
    return input
  }

  if (input && typeof input === 'object') {
    const objectValue = input as Record<string, unknown>

    if (Array.isArray(objectValue.items)) return objectValue.items
    if (Array.isArray(objectValue.content)) return objectValue.content
    if (Array.isArray(objectValue.data)) return objectValue.data
    if (Array.isArray(objectValue.results)) return objectValue.results
  }

  return []
}

const toObject = (input: unknown): Record<string, unknown> | null => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return null
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

const safeString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

const safeNullableString = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

const requestFirstArray = async (endpoints: string[]): Promise<unknown[]> => {
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint)
      return toArray(response.data)
    } catch {
      continue
    }
  }

  return []
}

const requestFirstObject = async (endpoints: string[]): Promise<Record<string, unknown> | null> => {
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint)
      return toObject(response.data)
    } catch {
      continue
    }
  }

  return null
}

export const getResidentHouseholdSummary = async (): Promise<HouseholdSummary | null> => {
  const summary = await requestFirstObject(['/households/me/summary'])
  if (!summary) {
    return null
  }

  return {
    householdId: toNumber(summary.householdId) || undefined,
    apartmentCode: safeNullableString(summary.apartmentCode),
    buildingName: safeNullableString(summary.buildingName),
    floorNumber: toNumber(summary.floorNumber),
    area: toNumber(summary.area),
    apartmentStatus: safeNullableString(summary.apartmentStatus),
    memberCount: toNumber(summary.memberCount),
    ownerName: safeNullableString(summary.ownerName),
  }
}

const mapPayment = (item: unknown): DashboardPayment => {
  const row = toObject(item) || {}
  const rawStatus = safeString(row.status || row.paymentStatus || row.state, 'UNPAID').toUpperCase()

  return {
    id: String(row.id ?? row.paymentId ?? row.invoiceCode ?? crypto.randomUUID()),
    title: safeString(row.title || row.description || row.type, 'Khoản phí cần thanh toán'),
    amount: toNumber(row.amount || row.totalAmount || row.value),
    dueDate: safeNullableString(row.dueDate || row.date || row.createdAt),
    status: rawStatus,
  }
}

const mapRequest = (item: unknown): DashboardRequest => {
  const row = toObject(item) || {}
  const rawStatus = safeString(row.status || row.requestStatus || row.state, 'PENDING').toUpperCase()

  return {
    id: String(row.id ?? row.requestId ?? row.code ?? crypto.randomUUID()),
    title: safeString(row.title || row.type, 'Yêu cầu hỗ trợ'),
    content: safeString(row.content || row.description || row.message, 'Không có mô tả chi tiết.'),
    createdAt: safeNullableString(row.createdAt || row.createdDate || row.date),
    status: rawStatus,
  }
}

export const getResidentNotifications = async (): Promise<DashboardNotification[]> => {
  const rows = await fetchMyNotifications()
  return rows.map((item) => ({
    id: String(item.id),
    title: item.title,
    content: item.content,
    createdAt: item.createdAt,
    isRead: item.isRead,
  }))
}

export const getResidentPayments = async (): Promise<DashboardPayment[]> => {
  const rows = await requestFirstArray(['/households/me/payments', '/payments/me', '/payments'])
  return rows.map(mapPayment)
}

export const getResidentRequests = async (): Promise<DashboardRequest[]> => {
  try {
    return await fetchUserRequestsForDashboard(50)
  } catch {
    const rows = await requestFirstArray(['/households/me/requests', '/requests/me', '/maintenance-requests/me'])
    return rows.map(mapRequest)
  }
}

export const getResidentDashboardData = async (): Promise<ResidentDashboardData> => {
  const [summary, notifications, payments, requests] = await Promise.all([
    getResidentHouseholdSummary(),
    getResidentNotifications(),
    getResidentPayments(),
    getResidentRequests(),
  ])

  const unreadNotifications = notifications.filter((item) => !item.isRead).length
  const inProgressRequests = requests.filter((item) => REQUEST_IN_PROGRESS_STATUSES.has(item.status)).length
  const totalUnpaidAmount = payments
    .filter((item) => PAYMENT_UNPAID_STATUSES.has(item.status))
    .reduce((sum, item) => sum + item.amount, 0)

  return {
    summary,
    notifications,
    payments,
    requests,
    unreadNotifications,
    inProgressRequests,
    totalUnpaidAmount,
  }
}
