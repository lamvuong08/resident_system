import type { ApartmentMeterReadingItem, ReadingActionItem } from './meterReadingApi'

export const readingStatus: Record<string, { label: string; color: string }> = {
  PENDING_APPROVAL: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Đã từ chối', color: 'red' },
  ISSUED: { label: 'Đã phát hành', color: 'blue' },
  LEGACY_ISSUED: { label: 'Đã phát hành trước chuyển đổi', color: 'blue' },
  LEGACY_REVIEW: { label: 'Dữ liệu cũ cần đối soát', color: 'default' },
}
export const readingNumber = (value: number | null | undefined): string =>
  value == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)
export const readingMoney = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
export const readingActions = (rows: ApartmentMeterReadingItem[]): ReadingActionItem[] => rows.flatMap(row =>
  row.readingId == null || row.version == null ? [] : [{ id: row.readingId, version: row.version }])
export const canSelectForIssue = (row: ApartmentMeterReadingItem): boolean =>
  row.approvalStatus === 'APPROVED' && row.eligibleForIssue && row.readingId != null && row.version != null
