/** Chuẩn hóa payload gửi lên API Resident (admin) hoặc /households/me/residents (cư dân). */

export const normalizeGenderForApi = (gender?: string | null) => {
  const value = (gender || '').toUpperCase().trim()
  if (value === 'M') return 'MALE'
  if (value === 'F') return 'FEMALE'
  if (value === 'MALE' || value === 'FEMALE' || value === 'OTHER') return value
  return null
}

export const normalizeRelationshipForApi = (relationship?: string | null) => {
  const value = (relationship || '').toUpperCase().trim()
  if (value === 'CHU_HO') return 'HEAD'
  if (value === 'VO_CHONG') return 'SPOUSE'
  if (value === 'CON') return 'CHILD'
  if (value === 'CHA_ME') return 'PARENT'
  if (value === 'NGUOI_THAN') return 'OTHER'
  if (value === 'HEAD' || value === 'SPOUSE' || value === 'CHILD' || value === 'PARENT' || value === 'OTHER') return value
  return 'OTHER'
}

export const sanitizeOptionalTextForApi = (value?: string | null) => {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return null
  return trimmed
}

export const formatDobFromForm = (dob: unknown): string | null => {
  if (!dob) return null
  if (typeof dob === 'object' && dob !== null && typeof (dob as { format?: (f: string) => string }).format === 'function') {
    return (dob as { format: (f: string) => string }).format('YYYY-MM-DD')
  }
  return null
}
