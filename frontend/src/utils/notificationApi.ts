import api from './api'
import type {
  NotificationAttachment,
  ResidentNotification,
  ResidentNotificationDetail,
} from '../types/notification'

const toObject = (input: unknown): Record<string, unknown> | null => {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    return input as Record<string, unknown>
  }
  return null
}

const toAttachment = (input: unknown): NotificationAttachment | null => {
  const row = toObject(input)
  if (!row) return null
  return {
    name: String(row.name ?? ''),
    url: String(row.url ?? ''),
  }
}

const toNotification = (input: unknown): ResidentNotification => {
  const row = toObject(input) || {}
  return {
    id: Number(row.id ?? 0),
    title: String(row.title ?? 'Thông báo hệ thống'),
    content: String(row.content ?? ''),
    type: String(row.type ?? 'GENERAL'),
    isRead: Boolean(row.isRead ?? false),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : null,
  }
}

const toNotificationDetail = (input: unknown): ResidentNotificationDetail => {
  const row = toObject(input) || {}
  const attachmentsRaw = Array.isArray(row.attachments) ? row.attachments : []
  return {
    ...toNotification(row),
    createdBy: String(row.createdBy ?? 'Hệ thống'),
    attachments: attachmentsRaw.map(toAttachment).filter(Boolean) as NotificationAttachment[],
  }
}

export const formatNotificationDate = (value: string | null): string => {
  if (!value) return 'Chưa rõ thời gian'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - date.getTime())
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'vừa xong'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`
  }
  return `${diffDays} ngày trước`
}

export const fetchMyNotifications = async (): Promise<ResidentNotification[]> => {
  const res = await api.get('/notifications/me')
  const rows = Array.isArray(res.data) ? res.data : []
  return rows.map(toNotification)
}

export const fetchMyNotificationDetail = async (id: number): Promise<ResidentNotificationDetail> => {
  const res = await api.get(`/notifications/${id}`)
  return toNotificationDetail(res.data)
}

export const markMyNotificationRead = async (id: number): Promise<void> => {
  await api.put(`/notifications/${id}/read`)
}

export const markMyNotificationsReadAll = async (): Promise<void> => {
  await api.put('/notifications/me/read-all')
}
