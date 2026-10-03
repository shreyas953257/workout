/** Identifiers. Collision-resistant without needing a crypto dependency at runtime. */

let counter = 0

/**
 * A short unique id. Prefers `crypto.randomUUID` when available and falls back
 * to a counter + random suffix, which is enough for local-only data.
 */
export function uid(prefix = 'id'): string {
  counter += 1
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c && typeof c.randomUUID === 'function') {
    return `${prefix}_${c.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36).slice(-6)
  return `${prefix}_${time}${counter.toString(36)}${rand}`
}

/** Stable, non-random id derived from content — used for set rows so re-renders do not churn keys. */
export function stableId(...parts: (string | number)[]): string {
  const input = parts.join('|')
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36)
}
