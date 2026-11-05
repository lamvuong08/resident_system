import type { AdminRequestRow, AssignmentHistory } from './adminSupportApi'
import { parseNotificationDate } from './notificationTime'

export const formatRequestDetailDate = (value: string | null | undefined): string => {
  const date = parseNotificationDate(value || null)
  if (!date) return 'Chưa có thông tin'
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || ''
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`
}

export type RequestDetailEvent = {
  key: string
  title: string
  date: string | null
  detail?: string
  color: string
}

export function buildRequestTimeline(request: AdminRequestRow, history: AssignmentHistory[]): RequestDetailEvent[] {
  const events: RequestDetailEvent[] = [
    { key: 'submitted', title: 'Yêu cầu được gửi', date: request.createdAt, detail: request.resident.name || undefined, color: 'blue' },
    ...[...history].sort((a, b) => a.id - b.id).map((item) => ({
      key: `assignment-${item.id}`,
      title: item.action === 'SELF_CLAIM' ? `${item.newStaff.name} tự tiếp nhận công việc`
        : item.action === 'ADMIN_REASSIGN' ? `${item.actor.name} chuyển giao cho ${item.newStaff.name}`
          : `${item.actor.name} phân công cho ${item.newStaff.name}`,
      date: item.createdAt,
      detail: [item.previousStaff ? `Người phụ trách trước: ${item.previousStaff.name}` : '', item.reason ? `Lý do: ${item.reason}` : ''].filter(Boolean).join('\n') || undefined,
      color: 'blue',
    })),
  ]
  if (parseNotificationDate(request.acceptedAt)) {
    // acceptedAt is the first start and survives reassignment. Its actor is not supplied by this API.
    events.push({ key: 'first-start', title: 'Bắt đầu xử lý lần đầu', date: request.acceptedAt, color: 'blue' })
  }
  if (parseNotificationDate(request.completedAt) || request.status === 'COMPLETED') {
    events.push({ key: 'completed', title: 'Yêu cầu hoàn thành', date: request.completedAt, color: 'green' })
  }
  if (request.status === 'REJECTED') {
    // Status proves rejection; the API has no rejectedAt. Never substitute render time or completedAt.
    events.push({ key: 'rejected', title: 'Yêu cầu đã bị từ chối', date: null, color: 'red' })
  }
  return events.map((event, index) => ({ event, index, time: parseNotificationDate(event.date)?.getTime() ?? null }))
    .sort((a, b) => {
      if (a.time === null && b.time === null) return a.index - b.index
      if (a.time === null) return 1
      if (b.time === null) return -1
      return a.time - b.time || a.index - b.index
    }).map(({ event }) => event)
}
