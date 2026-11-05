import api from './api'

const getBackendOrigin = () => {
    const baseUrl = api.defaults.baseURL ?? ''
    return baseUrl.replace(/\/api\/?$/, '') || window.location.origin
}

export const resolveAdminRequestAttachmentUrl = (fileUrl?: string | null): string => {
    if (!fileUrl) return ''
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    const normalized = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
    return `${getBackendOrigin()}${normalized}`
}

export type AdminRequestAttachment = {
    originalName: string
    storedFileName: string
    contentType: string
    sizeBytes: number
    previewUrl: string
    downloadUrl: string
}

export type AdminRequestStatusList = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type AdminRequestType = 'REPAIR' | 'COMPLAINT' | 'SUPPORT' | string

export type AdminRequestRow = {
    id: number
    title: string
    content: string
    type: AdminRequestType
    status: AdminRequestStatusList
    createdAt: string
    assignedStaff: { id: number; name: string } | null
    assignedBy: { id: number; name: string } | null
    assignedAt: string | null
    assignmentMethod: 'SELF_CLAIM' | 'ADMIN_ASSIGNED' | null
    acceptedAt: string | null
    completedAt: string | null
    canAccept: boolean
    canStart: boolean
    canAssign: boolean
    canReassign: boolean
    canComplete: boolean
    canReject: boolean
    resident: {
        name: string
        apartment: string
    }
    attachments?: AdminRequestAttachment[]
}

export type AssignableStaff = { id: number; name: string; unfinishedCount: number; assignedCount: number; processingCount: number }
export type AssignmentHistory = {
    id: number
    previousStaff: { id: number; name: string } | null
    newStaff: { id: number; name: string }
    actor: { id: number; name: string }
    action: 'SELF_CLAIM' | 'ADMIN_ASSIGN' | 'ADMIN_REASSIGN'
    createdAt: string
    reason: string | null
}

export const fetchAssignableStaff = async (): Promise<AssignableStaff[]> => (await api.get('/admin/requests/assignable-staff')).data
export const fetchAssignmentHistory = async (id: number): Promise<AssignmentHistory[]> => (await api.get(`/admin/requests/${id}/assignment-history`)).data
export const assignRequest = async (id: number, staffId: number): Promise<void> => { await api.post(`/admin/requests/${id}/assign`, { staffId }) }
export const reassignRequest = async (id: number, staffId: number, reason: string, expectedStaffId: number): Promise<void> => {
    await api.put(`/admin/requests/${id}/reassign`, { staffId, reason, expectedStaffId })
}
export const startAssignedRequest = async (id: number): Promise<void> => { await api.patch(`/admin/requests/${id}/start`) }

export const fetchAdminRequestAttachment = async (requestId: number, storedFileName: string): Promise<Blob> => {
    const response = await api.get(`/admin/requests/${requestId}/attachments/${encodeURIComponent(storedFileName)}`, { responseType: 'blob' })
    return response.data
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
        case 'ASSIGNED':
            return 'Đã phân công'
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
