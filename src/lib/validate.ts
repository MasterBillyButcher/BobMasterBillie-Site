// Server-side input caps. Every write route trims AND caps incoming
// strings, so no admin session (or a stolen one) can push oversized
// payloads into the database or the Activity Log.

export function capStr(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export function capOpt(value: unknown, max: number): string | null {
  const v = capStr(value, max)
  return v.length > 0 ? v : null
}

export function capNum(value: unknown, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(max, Math.trunc(n)))
}
