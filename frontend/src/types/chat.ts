export type ChatRole = 'user' | 'assistant'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  /** Chỉ dùng cho tin nhắn của người dùng: 'error' khi gửi thất bại. */
  status?: 'sent' | 'error'
  error?: string
}

export type ChatHistoryItem = Pick<ChatMessage, 'role' | 'content'>
