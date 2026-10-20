'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Small fetch hook with loading/error state and manual refetch.
export function useData<T>(url: string, pollMs?: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const json = (await res.json()) as T
      if (mounted.current) {
        setData(json)
        setError(null)
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
    let timer: ReturnType<typeof setInterval> | undefined
    if (pollMs) timer = setInterval(refetch, pollMs)
    return () => {
      mounted.current = false
      if (timer) clearInterval(timer)
    }
  }, [refetch, pollMs])

  return { data, loading, error, refetch }
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
