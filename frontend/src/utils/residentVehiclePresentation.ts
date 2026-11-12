import type { VehicleRow } from './vehicleApi'
import { parseNotificationDate } from './notificationTime'

export function residentVehicleCounts(vehicles: VehicleRow[]) {
  return {
    total: vehicles.length,
    approved: vehicles.filter(vehicle => vehicle.status === 'ACTIVE').length,
    pending: vehicles.filter(vehicle => vehicle.status === 'PENDING').length,
  }
}

export const residentVehicleStatusColor = (status: string) =>
  ({ PENDING: 'warning', ACTIVE: 'success', REJECTED: 'error' } as Record<string, string>)[status] || 'default'

export function vehicleRegistrationDate(value: string) {
  const date = parseNotificationDate(value)
  if (!date) return 'Chưa có thông tin'
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`
}

// Mirror existing backend upload constraints; plate and duplicate validation stay unchanged.
export function residentVehiclePhotoError(file: Pick<File, 'name' | 'type' | 'size'>) {
  if (!['image/jpeg', 'image/png'].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) return 'Chỉ chấp nhận ảnh JPG hoặc PNG.'
  if (file.size === 0) return 'Ảnh đang trống. Vui lòng chọn ảnh khác.'
  if (file.size > 5 * 1024 * 1024) return 'Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.'
  return ''
}

export function residentVehicleError(error: unknown, fallback: string) {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response
  // Preserve useful business validation (duplicate plate, missing household, upload size), not server traces.
  if ([400, 409, 413].includes(response?.status || 0)) {
    const data = response?.data
    const message = typeof data === 'string' ? data : (data as { message?: unknown })?.message
    if (typeof message === 'string' && message.length <= 400 && !/[<>]|\bat\s+com\.|SQLException|Exception:|stack trace/i.test(message)) return message
  }
  return fallback
}
