export type ResidentNotification = {
  id: number
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string | null
  actionUrl?: string
}

export type NotificationAttachment = {
  name: string
  url: string
}

export type ResidentNotificationDetail = ResidentNotification & {
  createdBy: string
  attachments: NotificationAttachment[]
}

export type RealtimeNotificationPayload = {
  id: number
  receiverId: number
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string | null
  actionUrl?: string
  eventType?: string
}
