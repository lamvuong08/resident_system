import api from './api'
export type MeterService = 'ELECTRICITY' | 'WATER'

export interface ApartmentMeterReadingItem {
  meterService?: MeterService
  linkedBillId?: number | null
  linkedBillStatus?: string | null
  readingId: number | null
  version: number | null
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'LEGACY_ISSUED' | 'LEGACY_REVIEW' | null
  recordedBy: string | null
  approvedBy: string | null
  approvedAt: string | null
  rejectionReason: string | null
  tariffSnapshot: string | null
  issuedBillDetailId: number | null
  eligibleForIssue: boolean
  issueBlockedReason: string | null
  apartmentId: number
  apartmentCode: string
  buildingId: number
  buildingCode: string
  buildingName: string
  floorNumber: number
  ownerName: string
  meterTypeId: number
  meterTypeName: string
  billingMonth: string
  oldReading: number
  newReading: number | null
  usageAmount: number | null
  calculatedAmount: number
  recordedStatus: 'RECORDED' | 'NOT_RECORDED'
  billStatus: 'PAID' | 'UNPAID' | string | null
  isLocked: boolean
  recordedAt: string | null
}

export interface BuildingOption {
  id: number
  code: string
  name: string
  totalFloors?: number
}

export const fetchMeterReadingApartments = async (params: {
  service?: MeterService
  buildingId?: number
  floor?: number
  billingMonth?: string
}): Promise<ApartmentMeterReadingItem[]> => {
  const res = await api.get<ApartmentMeterReadingItem[]>('/admin/meter-readings/apartments', {
    params,
  })
  return (res.data || []).map(row => ({ ...row, meterService: params.service || 'ELECTRICITY' }))
}

export const recordMeterReading = async (data: {
  service?: MeterService
  apartmentId: number
  meterTypeId?: number
  billingMonth: string
  newReading: number
  expectedVersion?: number
}): Promise<string> => {
  const res = await api.post('/admin/meter-readings/record', data)
  return res.data
}

export interface ReadingActionItem { id: number; version: number }
export interface ReadingBatchResult {
  succeeded: number
  failed: number
  results: { id: number; success: boolean; alreadyIssued: boolean; billId: number | null; message: string }[]
}
export const approveMeterReadings = async (items: ReadingActionItem[]): Promise<ReadingBatchResult> =>
  (await api.post('/admin/meter-readings/bulk-approve', { items })).data
export const issueMeterReadings = async (items: ReadingActionItem[], dueDate: string): Promise<ReadingBatchResult> =>
  (await api.post('/admin/meter-readings/bulk-issue', { items, dueDate })).data
export const rejectMeterReading = async (id: number, version: number, reason: string): Promise<void> => {
  await api.post(`/admin/meter-readings/${id}/reject`, { version, reason })
}
export interface ReadingAudit {
  id: number; action: string; actor: string; reason: string | null; oldReading: number; newReading: number
  estimatedAmount: number; tariffSnapshot: string | null; billDetailId: number | null; createdAt: string
}
export const fetchReadingHistory = async (id: number): Promise<ReadingAudit[]> =>
  (await api.get(`/admin/meter-readings/${id}/history`)).data

export const previewMeterReading = async (data: {
  service?: MeterService
  apartmentId: number
  meterTypeId?: number
  billingMonth?: string
  newReading: number
}): Promise<number> => {
  const res = await api.post('/admin/meter-readings/preview', data)
  return res.data
}

export const fetchBuildings = async (): Promise<BuildingOption[]> => {
  const res = await api.get('/dashboard/buildings')
  return (res.data || []).map((b: any) => ({
    id: b.id,
    code: b.code,
    name: b.name || `Tòa ${b.code}`,
    totalFloors: b.totalFloors || b.floors || 12,
  }))
}
