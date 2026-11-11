/** Parse the saved display snapshot only. Never calculate usage, tier amounts or totals. */
export function parseTariffSnapshot(snapshot: string | null | undefined) {
  if (!snapshot?.trim()) return null
  const segments = snapshot.split(';').map(part => part.trim())
  const effective = segments[0].match(/^Hiệu lực (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2}|không giới hạn)$/)
  if (effective) segments.shift()
  const tiers: {key: number; min: number; max: number | null; price: number; unit: string}[] = []
  for (const segment of segments) {
    const match = segment.match(/^(\d+)-(\d+|∞):\s*(\d+) đ\/(kWh|m³)$/)
    if (!match) return null
    const [, min, max, price, unit] = match
    if (![min, price, ...(max === '∞' ? [] : [max])].every(value => Number.isSafeInteger(Number(value)))) return null
    if (max !== '∞' && Number(max) < Number(min)) return null
    tiers.push({ key: tiers.length + 1, min: Number(min), max: max === '∞' ? null : Number(max), price: Number(price), unit })
  }
  if (!tiers.length || tiers.some(tier => tier.unit !== tiers[0].unit)) return null
  return { effective: effective ? `${effective[1]} → ${effective[2]}` : null, tiers }
}
