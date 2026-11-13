import { useCallback, useRef, useState } from 'react'
import { extractApiError } from '../utils/api'
import { sendChatMessage } from '../utils/chatApi'
import type { ChatMessage } from '../types/chat'

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const messagesRef = useRef<ChatMessage[]>([])
  const sendingRef = useRef(false)

  const commit = (next: ChatMessage[]) => {
    messagesRef.current = next
    setMessages(next)
  }

  const request = useCallback(async (userMessage: ChatMessage, history: ChatMessage[]) => {
    sendingRef.current = true
    setSending(true)
    try {
      const reply = await sendChatMessage(userMessage.content, history)
      commit([...messagesRef.current, { id: newId(), role: 'assistant', content: reply }])
    } catch (err) {
      const error = extractApiError(err, 'Không gửi được tin nhắn. Vui lòng thử lại.')
      commit(
        messagesRef.current.map((m) =>
          m.id === userMessage.id ? { ...m, status: 'error', error } : m,
        ),
      )
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [])

  const send = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content || sendingRef.current) return
      const history = messagesRef.current
      const userMessage: ChatMessage = { id: newId(), role: 'user', content, status: 'sent' }
      commit([...history, userMessage])
      void request(userMessage, history)
    },
    [request],
  )

  const retry = useCallback(
    (id: string) => {
      if (sendingRef.current) return
      const index = messagesRef.current.findIndex((m) => m.id === id)
      if (index < 0) return
      const history = messagesRef.current.slice(0, index)
      const userMessage: ChatMessage = { ...messagesRef.current[index], status: 'sent', error: undefined }
      commit(messagesRef.current.map((m) => (m.id === id ? userMessage : m)))
      void request(userMessage, history)
    },
    [request],
  )

  const reset = useCallback(() => {
    if (sendingRef.current) return
    commit([])
  }, [])

  return { messages, sending, send, retry, reset }
}
