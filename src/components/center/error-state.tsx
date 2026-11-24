'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Shared fetch-failure card - explains what happened and offers a retry.
// Shown only when the API call actually failed (stale data stays visible).
export default function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-center"
    >
      <AlertTriangle className="mx-auto h-5 w-5 text-destructive" aria-hidden />
      <p className="mt-2 text-sm font-medium">Could not load this data</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Try again
        </Button>
      )}
    </div>
  )
}
