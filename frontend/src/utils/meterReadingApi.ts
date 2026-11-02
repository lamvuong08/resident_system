import api from './api'

export interface ApartmentMeterReadingItem {
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
  buildingId?: number
  floor?: number
  billingMonth?: string
}): Promise<ApartmentMeterReadingItem[]> => {
  const res = await api.get<ApartmentMeterReadingItem[]>('/admin/meter-readings/apartments', {
    params,
  })
  return res.data || []
}

export const recordMeterReading = async (data: {
  apartmentId: number
  meterTypeId?: number
  billingMonth: string
  newReading: number
}): Promise<string> => {
  const res = await api.post('/admin/meter-readings/record', data)
  return res.data
}

export const previewMeterReading = async (data: {
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
