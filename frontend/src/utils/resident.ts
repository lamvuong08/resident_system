export type ResidentInput = {
  id?: number | string
  name?: string
  fullName?: string
  gender?: string | null
  dob?: string | null
  birthDate?: string | null
  birthYear?: number | null
  cccd?: string | null
  phone?: string | null
  relationship?: string | null
  role?: string | null
  status?: string | null
  householdId?: number | string | null
  age?: number | null
}

const genderLabels: Record<string, string> = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
  M: 'Nam',
  F: 'Nữ',
}

const relationshipLabels: Record<string, string> = {
  HEAD: 'Chủ hộ',
  SPOUSE: 'Vợ / Chồng',
  CHILD: 'Con',
  PARENT: 'Cha / Mẹ',
  OTHER: 'Khác',
  CHU_HO: 'Chủ hộ',
  VO_CHONG: 'Vợ / Chồng',
  CON: 'Con',
  CHA_ME: 'Cha / Mẹ',
  NGUOI_THAN: 'Khác',
}

export const formatResidentGender = (value?: string | null) => {
  if (!value) return '-'
  return genderLabels[value.toUpperCase()] || value
}

export const formatResidentRelationship = (value?: string | null) => {
  if (!value) return '-'
  const normalized = value.toUpperCase()
  return relationshipLabels[normalized] || value.replaceAll('_', ' ')
}

export const formatDateVN = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

export const normalizeResident = (resident: ResidentInput) => {
  const dob = resident.dob || resident.birthDate || null
  const derivedBirthYear = dob ? new Date(dob).getFullYear() : resident.birthYear ?? null

  return {
    ...resident,
    id: resident.id,
    name: resident.name || resident.fullName || '-',
    gender: resident.gender || null,
    genderLabel: formatResidentGender(resident.gender),
    dob,
    dobLabel: formatDateVN(dob),
    birthYear: derivedBirthYear,
    cccd: resident.cccd || '-',
    phone: resident.phone || '-',
    relationship: resident.relationship || resident.role || null,
    relationshipLabel: formatResidentRelationship(resident.relationship || resident.role),
    status: resident.status || null,
    householdId: resident.householdId ?? null,
    age: resident.age ?? (derivedBirthYear ? new Date().getFullYear() - derivedBirthYear : null),
  }
}

export const residentKey = (resident: any) => String(resident?.id ?? resident?.cccd ?? resident?.name ?? 'resident')