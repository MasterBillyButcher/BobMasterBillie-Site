'use client'

// Branded error boundary. Next.js calls this when a render or data
// exception escapes a page segment - the visitor gets a calm screen and
// a working "Try again" instead of a dead white page.

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl tracking-wide text-primary">Ouch</p>
      <h1 className="mt-3 font-display text-2xl tracking-wide sm:text-3xl">Something broke.</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        The error was logged. Try again - the rest of the site is usually fine.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Try again
      </button>
    </main>
  )
}
