import api from './api'
import type { DashboardRequest } from '../types/residentDashboard'
import type { UserRequestAttachment, UserRequestRow, UserRequestStats } from '../types/userSupport'

const toObject = (input: unknown): Record<string, unknown> | null => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return null
}

const mapAttachment = (item: unknown): UserRequestAttachment | null => {
  const row = toObject(item)
  if (!row) return null
  return {
    originalName: String(row.originalName ?? ''),
    storedFileName: String(row.storedFileName ?? ''),
    contentType: String(row.contentType ?? 'application/octet-stream'),
    sizeBytes: Number(row.sizeBytes ?? 0),
  }
}

const mapRow = (item: unknown): UserRequestRow => {
  const row = toObject(item) || {}
  const created = row.createdAt
  const rawAtt = row.attachments
  const attachments = Array.isArray(rawAtt)
    ? (rawAtt.map(mapAttachment).filter(Boolean) as UserRequestAttachment[])
    : []
  return {
    id: Number(row.id ?? 0),
    type: String(row.type ?? 'SUPPORT'),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'PENDING').toUpperCase(),
    createdAtRaw: typeof created === 'string' ? created : null,
    attachments,
  }
}

export function formatUserRequestDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getUserRequestTypeLabel(type: string): string {
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

export function userRowToDashboardRequest(row: UserRequestRow): DashboardRequest {
  return {
    id: String(row.id),
    title: getUserRequestTypeLabel(row.type),
    content: row.description,
    createdAt: row.createdAtRaw,
    status: row.status,
  }
}

export async function fetchUserRequestPage(
  page: number,
  size: number
): Promise<{ items: UserRequestRow[]; totalPages: number; totalElements: number }> {
  const res = await api.get('/user/history', { params: { page, size } })
  const data = toObject(res.data) || {}
  const content = Array.isArray(data.content) ? data.content : []
  return {
    items: content.map(mapRow),
    totalPages: Number(data.totalPages ?? 0),
    totalElements: Number(data.totalElements ?? 0),
  }
}

export async function fetchUserRequestStats(): Promise<UserRequestStats> {
  const res = await api.get('/user/history/stats')
  const d = toObject(res.data) || {}
  return {
    total: Number(d.total ?? 0),
    done: Number(d.done ?? 0),
    processing: Number(d.processing ?? 0),
    rejected: Number(d.rejected ?? 0),
  }
}

export const createUserRequest = async (payload: {
  type: string
  description: string
  files?: File[]
}) => {
  const formData = new FormData()

  formData.append("type", payload.type)
  formData.append("description", payload.description)

  if (payload.files && payload.files.length > 0) {
    payload.files.forEach(file => {
      formData.append("files", file)
    })
  }

  return api.post('/user/send-request', formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
}

export async function downloadUserRequestAttachment(requestId: number, storedFileName: string): Promise<Blob> {
  const res = await api.get(`/user/history/${requestId}/attachments/${encodeURIComponent(storedFileName)}`, {
    responseType: 'blob',
  })
  return res.data as Blob
}

export function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function updateUserRequest(
  id: number,
  payload: {
    type: string
    description: string
    keepStoredFileNames: string[]
    newFiles?: File[]
  }
): Promise<UserRequestRow> {
  const formData = new FormData()
  formData.append('type', payload.type)
  formData.append('description', payload.description)
  formData.append('keepStoredFileNames', JSON.stringify(payload.keepStoredFileNames))
  for (const file of payload.newFiles ?? []) {
    formData.append('files', file)
  }
  const res = await api.post(`/user/history/${id}/update`, formData)
  return mapRow(res.data)
}

export async function deleteUserRequest(id: number): Promise<void> {
  await api.delete(`/user/history/${id}`)
}

export async function fetchUserRequestsForDashboard(limit = 50): Promise<DashboardRequest[]> {
  const { items } = await fetchUserRequestPage(0, limit)
  return items.map(userRowToDashboardRequest)
}
