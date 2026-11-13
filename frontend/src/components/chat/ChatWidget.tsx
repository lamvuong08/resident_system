import React, { useEffect, useRef, useState } from 'react'
import {
  CloseOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useChat } from '../../hooks/useChat'
import { CHAT_MOCK } from '../../utils/chatApi'
import '../../styles/chat.css'

const SUGGESTIONS = [
  'Cách gửi yêu cầu sửa chữa',
  'Xem hóa đơn và thanh toán ở đâu?',
  'Đăng ký tạm trú, tạm vắng',
]

const MAX_INPUT_HEIGHT = 120

const ChatWidget: React.FC = () => {
  const { messages, sending, send, retry, reset } = useChat()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const el = listRef.current
    if (open && el) el.scrollTop = el.scrollHeight
  }, [open, messages, sending])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const closePanel = () => {
    setOpen(false)
    launcherRef.current?.focus()
  }

  const resizeInput = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`
  }

  const submit = (text: string) => {
    if (!text.trim() || sending) return
    send(text)
    setDraft('')
    requestAnimationFrame(resizeInput)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit(draft)
    }
  }

  const canSend = draft.trim().length > 0 && !sending

  return (
    <div className="chat-widget">
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label="Trợ lý cư dân"
          onKeyDown={(e) => {
            if (e.key === 'Escape') closePanel()
          }}
        >
          <header className="chat-panel__header">
            <span className="chat-panel__avatar" aria-hidden="true">
              <RobotOutlined />
            </span>
            <div className="chat-panel__title">
              <strong>Trợ lý cư dân</strong>
              <span>{CHAT_MOCK ? 'Bản thử nghiệm' : 'Hỏi đáp về căn hộ và dịch vụ'}</span>
            </div>
            <button
              type="button"
              className="chat-panel__icon-btn"
              onClick={reset}
              disabled={messages.length === 0 || sending}
              title="Cuộc trò chuyện mới"
              aria-label="Bắt đầu cuộc trò chuyện mới"
            >
              <PlusOutlined />
            </button>
            <button
              type="button"
              className="chat-panel__icon-btn"
              onClick={closePanel}
              title="Đóng"
              aria-label="Đóng trợ lý"
            >
              <CloseOutlined />
            </button>
          </header>

          <div className="chat-panel__body" ref={listRef} role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-empty">
                <p className="chat-empty__text">
                  Xin chào! Bạn cần hỏi gì về căn hộ, hóa đơn hay thủ tục cư trú?
                </p>
                <div className="chat-empty__chips">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" className="chat-chip" onClick={() => submit(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`chat-row chat-row--${m.role}`}>
                  <div className={`chat-bubble chat-bubble--${m.role}`}>{m.content}</div>
                  {m.status === 'error' && (
                    <div className="chat-error" role="alert">
                      <span>{m.error}</span>
                      <button type="button" onClick={() => retry(m.id)} disabled={sending}>
                        Gửi lại
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            {sending && (
              <div className="chat-row chat-row--assistant">
                <div className="chat-bubble chat-bubble--assistant chat-typing" aria-label="Trợ lý đang trả lời">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          <form
            className="chat-composer"
            onSubmit={(e) => {
              e.preventDefault()
              submit(draft)
            }}
          >
            <textarea
              ref={inputRef}
              className="chat-composer__input"
              rows={1}
              value={draft}
              placeholder="Nhập câu hỏi của bạn"
              aria-label="Nội dung tin nhắn"
              maxLength={1000}
              onChange={(e) => {
                setDraft(e.target.value)
                resizeInput()
              }}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="chat-composer__send" disabled={!canSend} aria-label="Gửi tin nhắn">
              <SendOutlined />
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        className="chat-launcher"
        onClick={() => (open ? closePanel() : setOpen(true))}
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý' : 'Mở trợ lý cư dân'}
        title={open ? 'Đóng trợ lý' : 'Hỏi trợ lý'}
      >
        {open ? <CloseOutlined /> : <MessageOutlined />}
      </button>
    </div>
  )
}

export default ChatWidget
