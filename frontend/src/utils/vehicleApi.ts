import api from './api'

export type VehicleStatusList = 'PENDING' | 'ACTIVE' | 'REJECTED' | string
export type VehicleType = 'CAR' | 'MOTORBIKE' | 'BICYCLE' | string

export type VehicleAttachmentRow = {
    id: number
    fileUrl: string
    createdAt: string
}

export type VehicleRow = {
    id: number
    licensePlate: string
    type: VehicleType
    status: VehicleStatusList
    createdAt: string
    thumbnailUrl?: string | null
    attachments?: VehicleAttachmentRow[]
    resident?: {
        name: string
        apartment: string
    }
}

const getBackendOrigin = () => {
    const baseUrl = api.defaults.baseURL ?? ''
    return baseUrl.replace(/\/api\/?$/, '') || window.location.origin
}

export const resolveVehicleMediaUrl = (fileUrl?: string | null): string => {
    if (!fileUrl) return ''
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl
    const normalized = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`
    return `${getBackendOrigin()}${normalized}`
}

export const getVehicleThumbnailUrl = (vehicle: VehicleRow): string => {
    return resolveVehicleMediaUrl(vehicle.thumbnailUrl ?? vehicle.attachments?.[0]?.fileUrl ?? '')
}

export const fetchAdminVehicles = async (params: { page: number; size: number; status?: string; searchQuery?: string }): Promise<{ items: VehicleRow[], totalPages: number, totalElements: number }> => {
    const res = await api.get('/admin/vehicles', {
        params: {
            page: params.page,
            size: params.size,
            status: params.status,
            search: params.searchQuery
        }
    })
    return res.data
}

export const updateVehicleStatus = async (id: number, status: string): Promise<void> => {
    await api.put(`/admin/vehicles/${id}/status`, { status })
}

export const deleteVehicle = async (id: number): Promise<void> => {
    await api.delete(`/admin/vehicles/${id}`)
}

export const fetchUserVehicles = async (): Promise<VehicleRow[]> => {
    const res = await api.get('/user/vehicles')
    return res.data
}

export const createUserVehicle = async (data: { licensePlate: string; type: string; file: File }): Promise<VehicleRow> => {
    const formData = new FormData()
    formData.append('license_plate', data.licensePlate)
    formData.append('type', data.type)
    formData.append('file', data.file)

    const res = await api.post('/user/vehicles', formData)
    return res.data
}

export const getVehicleTypeLabel = (type: string): string => {
    switch (type) {
        case 'CAR':
            return 'Ô tô'
        case 'MOTORBIKE':
            return 'Xe máy'
        case 'BICYCLE':
            return 'Xe đạp'
        default:
            return type
    }
}

export const getVehicleStatusLabel = (status: string): string => {
    switch (status) {
        case 'PENDING':
            return 'Chờ duyệt'
        case 'ACTIVE':
            return 'Đã duyệt'
        case 'REJECTED':
            return 'Từ chối'
        default:
            return status
    }
}
