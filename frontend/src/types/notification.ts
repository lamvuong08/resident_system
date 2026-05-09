export type ResidentNotification = {
  id: number
  title: string
  content: string
  type: string
  isRead: boolean
  createdAt: string | null
}

export type NotificationAttachment = {
  name: string
  url: string
}

export type ResidentNotificationDetail = ResidentNotification & {
  createdBy: string
  attachments: NotificationAttachment[]
}
