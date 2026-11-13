import api from './api'
import type { ChatHistoryItem, ChatMessage } from '../types/chat'

/**
 * Mặc định dùng trả lời giả để làm giao diện khi backend chưa có endpoint chat.
 * Khi backend sẵn sàng, tạo frontend/.env.local với VITE_CHAT_MOCK=false.
 */
export const CHAT_MOCK = import.meta.env.VITE_CHAT_MOCK !== 'false'

const MAX_HISTORY = 10

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const mockReply = (text: string): string => {
  const t = text.toLowerCase()
  if (/hóa đơn|thanh toán|điện|nước|phí/.test(t)) {
    return 'Bạn có thể xem các khoản phí và thanh toán tại mục "Thanh toán" ở thanh bên trái.'
  }
  if (/sửa|hỏng|yêu cầu|khiếu nại|hỗ trợ/.test(t)) {
    return 'Vào mục "Yêu cầu & Hỗ trợ", chọn tab "Tạo yêu cầu", mô tả sự cố và đính kèm ảnh nếu có. Ban quản lý sẽ cập nhật trạng thái xử lý trong "Lịch sử yêu cầu".'
  }
  if (/tạm trú|tạm vắng|khách/.test(t)) {
    return 'Bạn khai báo tại mục "Tạm trú / Tạm vắng". Hồ sơ sẽ ở trạng thái chờ duyệt cho đến khi ban quản lý xử lý.'
  }
  return 'Đây là chế độ thử nghiệm nên mình chưa trả lời được câu này. Khi kết nối với hệ thống, mình sẽ hỗ trợ đầy đủ hơn.'
}

export async function sendChatMessage(
  message: string,
  history: Pick<ChatMessage, 'role' | 'content'>[],
): Promise<string> {
  if (CHAT_MOCK) {
    await wait(900)
    return mockReply(message)
  }

  // Giả định hợp đồng API (cần thống nhất với backend):
  //   POST /api/user/chat  { message, history: [{ role, content }] }  ->  { reply }
  const payload: { message: string; history: ChatHistoryItem[] } = {
    message,
    history: history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content })),
  }
  const res = await api.post('/user/chat', payload)
  const reply = typeof res.data?.reply === 'string' ? res.data.reply.trim() : ''
  if (!reply) {
    throw new Error('Trợ lý chưa trả lời được. Vui lòng thử lại.')
  }
  return reply
}
