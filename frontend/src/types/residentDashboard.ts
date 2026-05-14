export type HouseholdSummary = {
  householdId?: number
  apartmentCode?: string | null
  buildingName?: string | null
  floorNumber?: number | null
  area?: number | null
  apartmentStatus?: string | null
  memberCount?: number
  ownerName?: string | null
}

export type DashboardNotification = {
  id: string
  title: string
  content?: string
  createdAt: string | null
  isRead: boolean
}

export type DashboardPayment = {
  id: string
  title: string
  amount: number
  dueDate: string | null
  status: string
  billingMonth?: number
  billingYear?: number
}

export type DashboardRequest = {
  id: string
  title: string
  content: string
  createdAt: string | null
  status: string
}

export type ResidentDashboardData = {
  summary: HouseholdSummary | null
  notifications: DashboardNotification[]
  payments: DashboardPayment[]
  requests: DashboardRequest[]
  unreadNotifications: number
  inProgressRequests: number
  totalUnpaidAmount: number
}
