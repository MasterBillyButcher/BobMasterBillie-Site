'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Lock, LockOpen, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

// Tiny module store so the header chip and any consumer stay in sync
let listeners: Array<() => void> = []
let unlockedSnapshot = false

export function setAdminUnlocked(value: boolean) {
  unlockedSnapshot = value
  for (const l of listeners) l()
}

export function useAdminUnlocked(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.push(cb)
      return () => {
        listeners = listeners.filter((l) => l !== cb)
      }
    },
    () => unlockedSnapshot,
    () => false,
  )
}

export function AdminGate() {
  const unlocked = useAdminUnlocked()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // The session cookie is httpOnly, so ask the server whether this
    // browser is already unlocked instead of reading the cookie here.
    fetch('/api/admin/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { unlocked: false }))
      .then((j: { unlocked?: boolean }) => setAdminUnlocked(Boolean(j.unlocked)))
      .catch(() => setAdminUnlocked(false))
  }, [])

  async function unlock() {
    if (!password.trim()) {
      toast({ title: 'Enter the password', variant: 'destructive' })
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setPassword('')
        setShowPassword(false)
        const input = document.getElementById('admin-password') as HTMLInputElement | null
        input?.focus()
        toast({
          title: data.error && res.status === 429 ? data.error : 'Wrong password',
          variant: 'destructive',
        })
        return
      }
      setPassword('')
      setShowPassword(false)
      setOpen(false)
      setAdminUnlocked(true)
      toast({ title: 'Unlocked' })
    } catch {
      toast({ title: 'Could not unlock', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  async function lock() {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' })
    } catch {
      // the UI still locks even if the request fails
    }
    setAdminUnlocked(false)
    toast({ title: 'Locked' })
  }

  if (!mounted) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (unlocked ? lock() : setOpen(true))}
        className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        aria-label={unlocked ? 'Lock the site (read-only)' : 'Unlock with admin password'}
        title={unlocked ? 'Lock' : 'Admin'}
      >
        {unlocked ? (
          <LockOpen className="h-3.5 w-3.5 text-primary" aria-hidden />
        ) : (
          <Lock className="h-3.5 w-3.5" aria-hidden />
        )}
        {unlocked ? 'Unlocked' : 'Locked'}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin password</DialogTitle>
            <DialogDescription>Team access only.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="sr-only">
              Password
            </Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') unlock()
                }}
                placeholder="Password"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={unlock} disabled={busy}>
              {busy ? 'Checking…' : 'Unlock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
