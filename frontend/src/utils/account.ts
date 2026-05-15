import api from './api'

export interface AccountStats {
  totalAccounts: number
  adminAccounts: number
  residentAccounts: number
}

export interface AccountItem {
  id: number
  fullName: string
  email: string
  phone: string
  role: 'ADMIN' | 'RESIDENT' | string
  status: 'ACTIVE' | 'DISABLED' | string
  apartmentCode?: string | null
  apartmentStatus?: string | null
  createdAt: string
}

export interface AccountPageResponse {
  items: AccountItem[]
  page: number
  size: number
  totalItems: number
  totalPages: number
  stats: AccountStats
}

export interface AccountUpsertRequest {
  name: string
  email: string
  phone: string
  password?: string
  role: string
  status: string
}

export const accountApi = {
  getAccounts: (page: number, size: number, search?: string, role?: string, status?: string) => {
    return api.get<AccountPageResponse>('/admin/accounts', {
      params: { page, size, search, role, status },
    })
  },

  getAccountById: (id: number) => {
    return api.get<AccountItem>(`/admin/accounts/${id}`)
  },

  createAccount: (data: AccountUpsertRequest) => {
    return api.post<AccountItem>('/admin/accounts', data)
  },

  updateAccount: (id: number, data: AccountUpsertRequest) => {
    return api.put<AccountItem>(`/admin/accounts/${id}`, data)
  },

  updateStatus: (id: number, isActive: boolean) => {
    return api.put(`/users/${id}/status`, { status: isActive })
  },

  deleteAccount: (id: number) => {
    return api.delete(`/admin/accounts/${id}`)
  },

  assignApartment: (id: number, data: { apartmentId: number; relationship: string }) => {
    return api.post(`/admin/accounts/${id}/assign-apartment`, data)
  },

  changeApartment: (id: number, data: { apartmentId: number; reason?: string }) => {
    return api.put(`/admin/accounts/${id}/change-apartment`, data)
  },

  removeApartment: (id: number) => {
    return api.put(`/admin/accounts/${id}/remove-apartment`)
  },
}
