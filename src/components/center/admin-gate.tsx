'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Lock, LockOpen } from 'lucide-react'

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

// Tiny module store so the header chip and the banner stay in sync
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

function cookiePresent(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((c) => c.trim().startsWith('admin_key='))
}

export function AdminGate() {
  const unlocked = useAdminUnlocked()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setAdminUnlocked(cookiePresent())
  }, [])

  async function unlock() {
    if (!password.trim()) {
      toast({ title: 'Enter the admin password', variant: 'destructive' })
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
        toast({ title: 'Wrong password', variant: 'destructive' })
        return
      }
      setPassword('')
      setOpen(false)
      setAdminUnlocked(true)
      toast({ title: 'Unlocked', description: 'You can edit everything now.' })
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
      // clearing the cookie locally still locks the UI
    }
    setAdminUnlocked(false)
    toast({ title: 'Locked', description: 'The site is read-only again.' })
  }

  if (!mounted) return null

  return (
    <>
      <button
        type="button"
        onClick={() => (unlocked ? lock() : setOpen(true))}
        className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        aria-label={unlocked ? 'Lock the site (read-only)' : 'Unlock with admin password'}
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
            <DialogTitle>Enter the admin password</DialogTitle>
            <DialogDescription>
              The site is read-only until it is unlocked. Anyone with the password can make
              changes, and every change is written to the Activity Log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') unlock()
              }}
              placeholder="Admin password"
              autoFocus
            />
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

export function AdminBanner() {
  const unlocked = useAdminUnlocked()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || unlocked) return null

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-400 sm:px-6 sm:text-sm">
      Read-only view. Click the Locked button in the header and enter the admin password to
      make changes.
    </div>
  )
}
