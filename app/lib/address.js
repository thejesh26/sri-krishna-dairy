export const TOWER_OPTIONS = ['1', '2', '3']

// Legacy text-parser for profiles that predate the structured tower/flat_no columns.
export function parseAddress(addressText) {
  if (!addressText) return { tower: null, flat: null }
  const text = addressText.toLowerCase()
  const towerMatch = text.match(/tower[\s-]*(\d+[a-z]?)|(?:^|\s)t(\d+)\b|block[\s-]*([a-z0-9]+)/i)
  const tower = towerMatch ? (towerMatch[1] || towerMatch[2] || towerMatch[3]) : null
  const numbers = text.match(/\d+/g) || []
  const flat = numbers.length > 0 ? numbers.reduce((a, b) => b.length >= a.length ? b : a) : null
  return { tower, flat: flat ? String(flat) : null }
}

export function parseFilterQuery(query) {
  const match = query.trim().match(/^t?(\d+)\s+(\d+)$/i)
  if (match) return { tower: match[1], flatPrefix: match[2] }
  const towerOnly = query.trim().match(/^t?(\d+)$/i)
  if (towerOnly) return { tower: towerOnly[1], flatPrefix: null }
  return null
}

// Prefers structured tower/flat_no when present; falls back to text-parsing legacy fields.
export function getAddress(profile) {
  if (!profile) return { tower: null, flat: null }
  if (profile.tower || profile.flat_no) {
    return { tower: profile.tower ?? null, flat: profile.flat_no ?? null }
  }
  const combined = [profile.apartment_name, profile.flat_number].filter(Boolean).join(' ')
  return parseAddress(combined)
}

// Extracts the longest contiguous digit run from a flat_number string for the structured flat_no column.
export function extractFlatNo(flatNumber) {
  if (!flatNumber) return null
  const numbers = flatNumber.match(/\d+/g) || []
  if (numbers.length === 0) return null
  return numbers.reduce((a, b) => b.length >= a.length ? b : a)
}

// Comparator for Array.sort — orders by tower (numeric asc, non-numeric after, null last),
// then by flat number (numeric asc). 'Other' and similar strings sort after numbered towers.
export function sortByTowerFlat(a, b) {
  const addrA = getAddress(a.profiles)
  const addrB = getAddress(b.profiles)

  if (!addrA.tower && addrB.tower) return 1
  if (addrA.tower && !addrB.tower) return -1

  if (addrA.tower !== addrB.tower) {
    const numA = parseInt(addrA.tower, 10)
    const numB = parseInt(addrB.tower, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    if (!isNaN(numA)) return -1
    if (!isNaN(numB)) return 1
    return (addrA.tower || '').localeCompare(addrB.tower || '')
  }

  const flatA = parseInt(addrA.flat, 10)
  const flatB = parseInt(addrB.flat, 10)
  if (!isNaN(flatA) && !isNaN(flatB)) return flatA - flatB
  return (addrA.flat || '').localeCompare(addrB.flat || '')
}
