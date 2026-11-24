'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Small fetch hook with loading/error state and manual refetch.
// fetchedAt is the time of the last successful response, so boards can show
// a quiet "Updated HH:MM" stamp.
export function useData<T>(url: string, pollMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const mounted = useRef(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json = (await res.json()) as T
      if (mounted.current) {
        setData(json)
        setError(null)
        setFetchedAt(Date.now())
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [url])

  useEffect(() => {
    mounted.current = true
    refetch()
    const cleanups: Array<() => void> = []

    if (pollMs) {
      const timer = setInterval(() => {
        // The tab is hidden - skip the poll, save the API call and battery.
        if (typeof document !== 'undefined' && document.hidden) return
        refetch()
      }, pollMs)
      cleanups.push(() => clearInterval(timer))

      // Back on screen - refresh immediately instead of waiting for the tick.
      const onVisible = () => {
        if (!document.hidden) refetch()
      }
      document.addEventListener('visibilitychange', onVisible)
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisible))
    }

    return () => {
      mounted.current = false
      for (const fn of cleanups) fn()
    }
  }, [refetch, pollMs])

  return { data, loading, error, refetch, fetchedAt }
}

// "14:32" from a fetchedAt timestamp, or an empty string before the first fetch.
export function stampTime(fetchedAt: number | null): string {
  if (!fetchedAt) return ''
  return new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Copy text to clipboard with a legacy fallback.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.max(0, Date.now() - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
