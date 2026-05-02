/** Lấy 1–2 chữ cái đầu từ họ tên (UI avatar). */
export const displayInitials = (name?: string | null): string => {
  const t = (name || '').trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
