import api from './api'

export type AdminRequestStatusList = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type AdminRequestType = 'REPAIR' | 'COMPLAINT' | 'SUPPORT' | string

export type AdminRequestRow = {
    id: number
    title: string
    content: string
    type: AdminRequestType
    status: AdminRequestStatusList
    createdAt: string
    resident: {
        name: string
        apartment: string
    }
    attachments?: string[]
}

export const fetchAdminRequests = async (params: { page: number; size: number; status?: string; type?: string; searchQuery?: string }): Promise<{ items: AdminRequestRow[], totalPages: number, totalElements: number }> => {
    const res = await api.get('/admin/requests', {
        params: {
            page: params.page,
            size: params.size,
            status: params.status,
            type: params.type,
            search: params.searchQuery
        }
    })
    return res.data
}

export const getAdminRequestDetail = async (id: number): Promise<AdminRequestRow> => {
    const res = await api.get(`/admin/requests/${id}`)
    return res.data
}

export const setAdminRequestInProgress = async (id: number): Promise<void> => {
    await api.patch(`/admin/requests/${id}/in-progress`)
}

export const setAdminRequestCompleted = async (id: number): Promise<void> => {
    await api.patch(`/admin/requests/${id}/complete`)
}

export const setAdminRequestRejected = async (id: number, reason: string): Promise<void> => {
    await api.patch(`/admin/requests/${id}/reject`, { reason })
}

export const getAdminRequestTypeLabel = (type: string): string => {
    switch (type) {
        case 'REPAIR':
            return 'Sửa chữa'
        case 'COMPLAINT':
            return 'Khiếu nại'
        case 'SUPPORT':
            return 'Hỗ trợ'
        default:
            return type
    }
}

export const getAdminRequestStatusLabel = (status: string): string => {
    switch (status) {
        case 'PENDING':
            return 'Chờ xử lý'
        case 'IN_PROGRESS':
            return 'Đang xử lý'
        case 'COMPLETED':
            return 'Hoàn thành'
        case 'REJECTED':
            return 'Đã từ chối'
        default:
            return status
    }
}
