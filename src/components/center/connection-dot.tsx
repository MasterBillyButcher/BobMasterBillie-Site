'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// Footer status dot - checks /api/health on mount and every 60 seconds.
// Green = database connected, amber = the API or database is unreachable.
// Read-only: no writes, nothing logged.
export default function ConnectionDot() {
  const [state, setState] = useState<'connecting' | 'live' | 'down'>('connecting')

  useEffect(() => {
    let alive = true

    async function check() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (!alive) return
        setState(res.ok && json?.database === 'connected' ? 'live' : 'down')
      } catch {
        if (alive) setState('down')
      }
    }

    check()
    const timer = setInterval(check, 60000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const label =
    state === 'live' ? 'Live' : state === 'down' ? 'Connection issue' : 'Connecting'

  return (
    <span
      className="inline-flex items-center gap-1.5"
      role="status"
      aria-label={`Database status: ${label}`}
    >
      <span className="relative flex h-2 w-2">
        {state === 'live' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            state === 'live' && 'bg-green-400',
            state === 'down' && 'bg-amber-400',
            state === 'connecting' && 'bg-muted-foreground'
          )}
        />
      </span>
      {label}
    </span>
  )
}
