import api from './api'
import { fetchUserRequestsForDashboard } from './userSupportApi'
import { fetchMyNotifications } from './notificationApi'
import type {
  DashboardNotification,
  DashboardPayment,
  DashboardRequest,
  HouseholdSummary,
  ResidentDashboardData,
  UserAggregatedBill,
  UserBillFull,
} from '../types/residentDashboard'

const REQUEST_IN_PROGRESS_STATUSES = new Set(['IN_PROGRESS', 'PROCESSING', 'PENDING', 'DANG_XU_LY'])
const PAYMENT_UNPAID_STATUSES = new Set(['UNPAID', 'PENDING', 'DUE', 'UNPAID_INVOICE'])

export function formatBillingPeriod(month?: number, year?: number) {
  if (!month || !year) return ''
  return `(Tháng ${String(month).padStart(2, '0')} - ${year})`
}

const formatDate = (isoString: unknown): string | null => {
  if (typeof isoString !== 'string' || !isoString.trim()) return null;
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch {
    return null;
  }
}

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
  try {
    const response = await api.get('/bills/user/details?statuses=UNPAID,PENDING');
    const rows = toArray(response.data);

    return rows.map((item): DashboardPayment => {
      const row = toObject(item) || {};

      const feeName = safeString(row.feeTypeName, 'Khoản phí');
      const billingMonthStr = safeString(row.billingMonth, '');
      const rawStatus = safeString(row.status, 'UNPAID').toUpperCase();

      let bMonth: number | undefined;
      let bYear: number | undefined;

      if (billingMonthStr.includes('/')) {
        const [m, y] = billingMonthStr.split('/');
        bMonth = parseInt(m, 10);
        bYear = parseInt(y, 10);
      } else if (billingMonthStr.includes('-')) {
        const parts = billingMonthStr.split('-');
        if (parts[0].length === 4) {
          bYear = parseInt(parts[0], 10);
          bMonth = parseInt(parts[1], 10);
        } else {
          bMonth = parseInt(parts[0], 10);
          bYear = parseInt(parts[1], 10);
        }
      } else if (billingMonthStr) {
        bMonth = parseInt(billingMonthStr, 10);
        const createdAtStr = safeString(row.createdAt || '', '');
        if (createdAtStr) {
          const date = new Date(createdAtStr);
          if (!isNaN(date.getTime())) {
            bYear = date.getFullYear();
          }
        }
      }

      return {
        id: String(row.detailId ?? crypto.randomUUID()),
        title: feeName,
        amount: toNumber(row.amount),
        dueDate: formatDate(row.dueDate),
        status: rawStatus,
        billingMonth: bMonth,
        billingYear: bYear,
      };
    });
  } catch (error) {
    console.error("Lỗi khi tải danh sách thanh toán Dashboard:", error);
    return [];
  }
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

export const getMyAggregatedBills = async (): Promise<UserAggregatedBill[]> => {
  try {
    const response = await api.get('/bills/user/bills');
    return toArray(response.data) as UserAggregatedBill[];
  } catch (error) {
    console.error("Lỗi khi tải lịch sử hóa đơn:", error);
    return [];
  }
}

export const getMyBillDetail = async (id: number): Promise<UserBillFull | null> => {
  try {
    const response = await api.get(`/bills/user/bills/${id}`);
    return response.data as UserBillFull;
  } catch (error) {
    console.error("Lỗi khi tải chi tiết hóa đơn:", error);
    return null;
  }
}
