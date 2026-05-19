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

export type UserAggregatedBill = {
  id: number;
  apartmentCode: string;
  ownerName: string;
  billingMonth: string;
  totalAmount: number;
  dueDate: string | null;
  status: string;
};

export type UserBillDetailInfo = {
  id: number;
  feeName: string;
  amount: number;
  note: string;
  oldReading: number | null;
  newReading: number | null;
  unitPrice: number | null;
  quantity: number | null;
};

export type UserBillFull = {
  id: number;
  apartmentCode: string;
  ownerName: string;
  billingMonth: string;
  dueDate: string | null;
  totalAmount: number;
  status: string;
  details: UserBillDetailInfo[];
  paidAt?: string;
  paymentMethod?: string;
  transactionCode?: string;
};
