// Spring LocalDateTime has no offset. Notification dates use Asia/Ho_Chi_Minh.
export const parseNotificationDate = (value: string | null): Date | null => {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})?$/i.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute, second = '0', fraction = '', offset] = match
  const calendar = new Date(0)
  calendar.setUTCFullYear(Number(year), Number(month) - 1, Number(day))
  calendar.setUTCHours(Number(hour), Number(minute), Number(second), 0)
  if (
    calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 ||
    calendar.getUTCDate() !== Number(day) || calendar.getUTCHours() !== Number(hour) ||
    calendar.getUTCMinutes() !== Number(minute) || calendar.getUTCSeconds() !== Number(second)
  ) return null
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second.padStart(2, '0')}.${fraction.padEnd(3, '0').slice(0, 3)}${offset || '+07:00'}`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatNotificationDate = (value: string | null, now = Date.now()): string => {
  const date = parseNotificationDate(value)
  if (!date) return 'Chưa rõ thời gian'
  const minutes = Math.floor(Math.max(0, now - date.getTime()) / 60000)
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút trước`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} giờ trước`
  return `${Math.floor(hours / 24)} ngày trước`
}
