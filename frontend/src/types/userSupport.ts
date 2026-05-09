export const USER_REQUEST_TYPE = {
  REPAIR: 'REPAIR',
  COMPLAINT: 'COMPLAINT',
  SUPPORT: 'SUPPORT',
} as const

export type UserRequestTypeValue = (typeof USER_REQUEST_TYPE)[keyof typeof USER_REQUEST_TYPE]

export type UserRequestAttachment = {
  originalName: string
  storedFileName: string
  contentType: string
  sizeBytes: number
}

export type UserRequestRow = {
  id: number
  type: string
  description: string
  status: string
  createdAtRaw: string | null
  attachments: UserRequestAttachment[]
}

export type UserRequestStats = {
  total: number
  done: number
  processing: number
  rejected: number
}
