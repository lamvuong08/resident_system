import api from './api'
import type { DashboardRequest } from '../types/residentDashboard'
import type { UserRequestAttachment, UserRequestRow, UserRequestStats } from '../types/userSupport'

export const RESIDENCE_RECORD_TYPE = {
  TEMPORARY_STAY: 'TEMPORARY_STAY',
  TEMPORARY_ABSENCE: 'TEMPORARY_ABSENCE',
} as const

export const RESIDENCE_RECORD_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const

export type ResidenceRecordTypeValue = (typeof RESIDENCE_RECORD_TYPE)[keyof typeof RESIDENCE_RECORD_TYPE]
export type ResidenceRecordStatusValue = (typeof RESIDENCE_RECORD_STATUS)[keyof typeof RESIDENCE_RECORD_STATUS]

export type ResidenceRecordRow = {
  id: number
  recordCode: string
  residentId: number | null
  residentName: string
  submittedByName: string
  relatedPersonName: string
  cccd: string
  buildingCode: string
  buildingName: string
  apartmentCode: string
  floorNumber: number | null
  roomNumber: number | null
  headOfHouseholdName: string
  type: ResidenceRecordTypeValue | string
  status: ResidenceRecordStatusValue | string
  reason: string
  guestName: string
  guestCccd: string
  guestPhone: string
  guestRelationship: string
  startDate: string | null
  endDate: string | null
}

export type ResidenceRecordCreatePayload = {
  type: ResidenceRecordTypeValue
  residentId?: number
  householdId?: number
  guestName?: string
  guestCccd?: string
  guestPhone?: string
  guestRelationship?: string
  reason: string
  startDate: string
  endDate: string | null
}

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

const toResidenceRecordType = (value: unknown): ResidenceRecordTypeValue | string => {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === RESIDENCE_RECORD_TYPE.TEMPORARY_STAY || normalized === RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE) {
    return normalized
  }
  return normalized || RESIDENCE_RECORD_TYPE.TEMPORARY_STAY
}

const toResidenceRecordStatus = (value: unknown): ResidenceRecordStatusValue | string => {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (
    normalized === RESIDENCE_RECORD_STATUS.PENDING ||
    normalized === RESIDENCE_RECORD_STATUS.APPROVED ||
    normalized === RESIDENCE_RECORD_STATUS.REJECTED ||
    normalized === RESIDENCE_RECORD_STATUS.CANCELLED
  ) {
    return normalized
  }
  return normalized || RESIDENCE_RECORD_STATUS.PENDING
}

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const toStringOrEmpty = (value: unknown): string => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  return String(value).trim()
}

const mapResidenceRecord = (item: unknown): ResidenceRecordRow => {
  const row = toObject(item) || {}
  return {
    id: Number(row.id ?? 0),
    recordCode: toStringOrEmpty(row.recordCode || row.id || '-'),
    residentId: toNumberOrNull(row.residentId),
    residentName: toStringOrEmpty(row.residentName || row.relatedPersonName || row.guestName || '-'),
    submittedByName: toStringOrEmpty(row.submittedByName || row.residentName || row.relatedPersonName || row.guestName || '-'),
    relatedPersonName: toStringOrEmpty(row.relatedPersonName || row.residentName || row.guestName || '-'),
    cccd: toStringOrEmpty(row.cccd || row.guestCccd),
    buildingCode: toStringOrEmpty(row.buildingCode),
    buildingName: toStringOrEmpty(row.buildingName),
    apartmentCode: toStringOrEmpty(row.apartmentCode),
    floorNumber: toNumberOrNull(row.floorNumber),
    roomNumber: toNumberOrNull(row.roomNumber),
    headOfHouseholdName: toStringOrEmpty(row.headOfHouseholdName),
    type: toResidenceRecordType(row.type),
    status: toResidenceRecordStatus(row.status),
    reason: toStringOrEmpty(row.reason),
    guestName: toStringOrEmpty(row.guestName),
    guestCccd: toStringOrEmpty(row.guestCccd),
    guestPhone: toStringOrEmpty(row.guestPhone),
    guestRelationship: toStringOrEmpty(row.guestRelationship),
    startDate: typeof row.startDate === 'string' ? row.startDate : null,
    endDate: typeof row.endDate === 'string' ? row.endDate : null,
  }
}

const STAY_REL_PREFIX = /^Quan hệ với chủ hộ:\s*/i
const STAY_REASON_PREFIX = /^Lý do:\s*/i

export function displayTemporaryStayGuestRelationship(
  row: Pick<ResidenceRecordRow, 'type' | 'guestRelationship' | 'reason'>
): string {
  if (String(row.type).toUpperCase() !== RESIDENCE_RECORD_TYPE.TEMPORARY_STAY) return '—'
  const saved = (row.guestRelationship ?? '').trim()
  if (saved) return saved
  const blob = (row.reason ?? '').trim()
  if (!blob) return '—'
  const firstLine = blob.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
  if (firstLine && STAY_REL_PREFIX.test(firstLine)) {
    const v = firstLine.replace(STAY_REL_PREFIX, '').trim()
    return v || '—'
  }
  return '—'
}

export function displayTemporaryStayReasonOnly(
  row: Pick<ResidenceRecordRow, 'type' | 'guestRelationship' | 'reason'>
): string {
  if (String(row.type).toUpperCase() !== RESIDENCE_RECORD_TYPE.TEMPORARY_STAY) {
    return (row.reason ?? '').trim() || '—'
  }
  const savedRel = (row.guestRelationship ?? '').trim()
  const reason = (row.reason ?? '').trim()
  if (savedRel) return reason || '—'
  const lines = (row.reason ?? '')
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return '—'
  const chunks: string[] = []
  for (const line of lines) {
    if (STAY_REL_PREFIX.test(line)) continue
    if (STAY_REASON_PREFIX.test(line)) chunks.push(line.replace(STAY_REASON_PREFIX, '').trim())
    else chunks.push(line)
  }
  return chunks.filter(Boolean).join('\n').trim() || '—'
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

export async function fetchMyResidenceRecords(): Promise<ResidenceRecordRow[]> {
  const res = await api.get('/residence-records/me')
  const payload = Array.isArray(res.data) ? res.data : []
  return payload.map(mapResidenceRecord)
}

export function formatResidenceRecordDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function getResidenceRecordTypeLabel(type: string): string {
  switch (String(type).toUpperCase()) {
    case RESIDENCE_RECORD_TYPE.TEMPORARY_STAY:
      return 'Tạm trú'
    case RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE:
      return 'Tạm vắng'
    default:
      return type || '—'
  }
}

export function getResidenceRecordStatusLabel(status: string): string {
  switch (String(status).toUpperCase()) {
    case RESIDENCE_RECORD_STATUS.PENDING:
      return 'Chờ duyệt'
    case RESIDENCE_RECORD_STATUS.APPROVED:
      return 'Đã duyệt'
    case RESIDENCE_RECORD_STATUS.REJECTED:
      return 'Từ chối'
    case RESIDENCE_RECORD_STATUS.CANCELLED:
      return 'Đã huỷ'
    default:
      return status || '—'
  }
}

export function getResidenceRecordStatusColor(status: string): 'warning' | 'success' | 'error' | 'default' {
  switch (String(status).toUpperCase()) {
    case RESIDENCE_RECORD_STATUS.PENDING:
      return 'warning'
    case RESIDENCE_RECORD_STATUS.APPROVED:
      return 'success'
    case RESIDENCE_RECORD_STATUS.REJECTED:
      return 'error'
    case RESIDENCE_RECORD_STATUS.CANCELLED:
      return 'default'
    default:
      return 'default'
  }
}

export function getResidenceRecordTypeColor(type: string): 'blue' | 'orange' | 'default' {
  switch (String(type).toUpperCase()) {
    case RESIDENCE_RECORD_TYPE.TEMPORARY_STAY:
      return 'blue'
    case RESIDENCE_RECORD_TYPE.TEMPORARY_ABSENCE:
      return 'orange'
    default:
      return 'default'
  }
}

export async function createResidenceRecordRequest(payload: ResidenceRecordCreatePayload): Promise<{ id?: number; type?: string; status?: string; message?: string }> {
  const res = await api.post('/residence-records', payload)
  return toObject(res.data) || {}
}

export async function updateResidenceRecordRequest(
  id: number,
  payload: ResidenceRecordCreatePayload
): Promise<{ id?: number; type?: string; status?: string; message?: string }> {
  const res = await api.patch(`/residence-records/${id}`, payload)
  return toObject(res.data) || {}
}

export async function cancelResidenceRecordRequest(id: number): Promise<{ id?: number; status?: string; message?: string }> {
  const res = await api.patch(`/residence-records/${id}/cancel`)
  return toObject(res.data) || {}
}
