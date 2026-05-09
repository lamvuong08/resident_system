import { jsPDF } from 'jspdf'
import type { HouseholdSummary } from '../types/residentDashboard'
import type { MyHouseholdResident } from '../types/householdProfile'
import { formatDateVN, formatResidentGender, formatResidentRelationship } from './resident'

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const toStringOrNull = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

export const parseMyHouseholdResident = (raw: unknown): MyHouseholdResident | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = toNumber(r.id)
  if (id == null) return null
  const hid = toNumber(r.householdId)
  if (hid == null) return null

  return {
    id,
    name: toStringOrNull(r.name) || '-',
    gender: toStringOrNull(r.gender),
    dob: toStringOrNull(r.dob),
    age: toNumber(r.age),
    cccd: toStringOrNull(r.cccd),
    phone: toStringOrNull(r.phone),
    relationship: toStringOrNull(r.relationship),
    residentCategory: toStringOrNull(r.residentCategory),
    occupancyStatus: toStringOrNull(r.occupancyStatus),
    status: toStringOrNull(r.status),
    householdId: hid,
  }
}

export const apartmentStatusLabel = (status?: string | null) => {
  if (!status) return 'Chưa xác định'
  const u = status.toUpperCase()
  if (u === 'OCCUPIED') return 'Đang ở'
  if (u === 'EMPTY') return 'Trống'
  if (u === 'MAINTENANCE') return 'Bảo trì'
  if (u === 'UNKNOWN') return 'Chưa xác định'
  return status
}

export const apartmentStatusBadge = (status?: string | null): { color: string; label: string } => {
  const label = apartmentStatusLabel(status)
  const u = (status || '').toUpperCase()
  if (u === 'OCCUPIED') return { color: 'success', label }
  if (u === 'EMPTY') return { color: 'warning', label }
  if (u === 'MAINTENANCE') return { color: 'warning', label }
  return { color: 'default', label }
}

export const occupancyStatusLabel = (value?: string | null) => {
  if (!value) return '-'
  const u = value.toUpperCase()
  if (u === 'LIVING') return 'Đang cư trú'
  if (u === 'TEMP_ABSENT') return 'Tạm vắng'
  if (u === 'EXPIRED') return 'Đã chuyển đi / hết hiệu lực'
  return value
}

export const occupancyStatusBadgeColor = (value?: string | null) => {
  const u = (value || '').toUpperCase()
  if (u === 'LIVING') return 'success'
  if (u === 'TEMP_ABSENT') return 'warning'
  if (u === 'EXPIRED') return 'error'
  return 'default'
}

export const relationshipRoleBadge = (relationship?: string | null) => {
  const u = (relationship || '').toUpperCase()
  if (u === 'HEAD' || u === 'CHU_HO') return { color: 'blue' as const, label: formatResidentRelationship(relationship) }
  if (u === 'CHILD' || u === 'CON') return { color: 'gold' as const, label: formatResidentRelationship(relationship) }
  return { color: 'default' as const, label: formatResidentRelationship(relationship) }
}

export const exportHouseholdProfilePdf = (summary: HouseholdSummary | null, residents: MyHouseholdResident[]) => {
  const doc = new jsPDF()
  let y = 16

  doc.setFontSize(16)
  doc.text('Hồ sơ & Hộ khẩu', 14, y)
  y += 10

  doc.setFontSize(11)
  const aptLines = [
    `Mã căn hộ: ${summary?.apartmentCode || '-'}`,
    `Tòa nhà: ${summary?.buildingName || '-'}`,
    `Tầng: ${summary?.floorNumber ?? '-'}`,
    `Diện tích: ${summary?.area != null ? `${summary.area} m²` : '-'}`,
    `Chủ hộ: ${summary?.ownerName || '-'}`,
    `Trạng thái căn hộ: ${apartmentStatusLabel(summary?.apartmentStatus)}`,
    `Số thành viên: ${summary?.memberCount ?? residents.length}`,
  ]
  aptLines.forEach((line) => {
    doc.text(line, 14, y)
    y += 7
  })

  y += 4
  doc.setFontSize(14)
  doc.text('Danh sách cư dân', 14, y)
  y += 8
  doc.setFontSize(10)

  if (residents.length === 0) {
    doc.text('Chưa có thành viên.', 14, y)
  } else {
    residents.forEach((r, i) => {
      const row = `${i + 1}. ${r.name} | ${formatResidentGender(r.gender)} | ${r.phone || '-'} | ${formatResidentRelationship(r.relationship)} | NS: ${formatDateVN(r.dob)} | CCCD: ${r.cccd || '-'} | ${occupancyStatusLabel(r.occupancyStatus)}`
      const lines = doc.splitTextToSize(row, 180)
      if (y > 270) {
        doc.addPage()
        y = 16
      }
      doc.text(lines, 14, y)
      y += lines.length * 6 + 1
    })
  }

  const code = summary?.apartmentCode || 'ho-khau'
  doc.save(`ho-khau-${code}.pdf`)
}
