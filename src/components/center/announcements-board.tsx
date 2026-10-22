'use client'

import { useState } from 'react'
import { Announcement } from '@/lib/types'
import { useData, timeAgo, copyText } from '@/hooks/use-data'
import { useAdminUnlocked } from '@/components/center/admin-gate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Megaphone,
  MegaphoneOff,
  Copy,
  Check,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react'

// Ready-made emergency messages - one tap fills the box, tweak and post.
const starterTemplates: Array<{ label: string; message: string }> = [
  {
    label: 'No stream tonight',
    message:
      "🚨 No stream tonight, y'all.\n💜 He'll see everyone tomorrow night!",
  },
  {
    label: 'Chat as usual',
    message:
      '💬 Stream chat will still happen at the usual time.\n⏳ Wait for it 💜',
  },
  {
    label: 'Late start',
    message:
      '🔴 Stream is starting later than usual today.\n⏳ We go live a bit late - hang tight!\n💬 Chat is open while you wait.',
  },
  {
    label: 'Starting soon',
    message:
      '🔴 Starting soon!\nGrab your snacks and get comfy.\n💬 Chat is already open - see you in a few minutes!',
  },
  {
    label: 'Technical issues',
    message:
      '⚠️ Having some technical issues right now.\n🔧 Working on a fix - give us a few minutes.\n💬 Hang out in chat meanwhile!',
  },
  {
    label: 'Schedule change',
    message:
      '📅 Schedule update: stream times are changing this week.\nCheck the schedule for the new times.\n💜 Thanks for staying flexible!',
  },
]

export default function AnnouncementsBoard() {
  const { data: announcements, loading, refetch } = useData<Announcement[]>(
    '/api/announcements',
    10000
  )
  const unlocked = useAdminUnlocked()
  const { toast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // create / edit dialog
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [showOnDashboard, setShowOnDashboard] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function copy(id: string, text: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopiedId(id)
      toast({ title: 'Announcement copied', description: 'Paste it into Twitch or Discord.' })
      setTimeout(() => setCopiedId(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  async function submit() {
    if (!message.trim()) {
      toast({ title: 'Message is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = editId
        ? await fetch(`/api/announcements/${editId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, active: showOnDashboard }),
          })
        : await fetch('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, active: showOnDashboard }),
          })
      if (!res.ok) throw new Error('Failed')
      setOpen(false)
      setMessage('')
      setShowOnDashboard(true)
      setEditId(null)
      toast({ title: editId ? 'Announcement updated' : 'Announcement added' })
      refetch()
    } catch {
      toast({ title: editId ? 'Could not update' : 'Could not add announcement', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      refetch()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Announcement deleted' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  function openEdit(a: Announcement) {
    setEditId(a.id)
    setMessage(a.message)
    setShowOnDashboard(a.active)
    setOpen(true)
  }

  function openNew() {
    setEditId(null)
    setMessage('')
    setShowOnDashboard(true)
    setOpen(true)
  }

  const sorted = [...(announcements ?? [])].sort(
    (a, b) => Number(b.active) - Number(a.active) || b.createdAt.localeCompare(a.createdAt)
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Ready-to-send messages - one click copies the whole thing for Twitch or Discord.
          </p>
        </div>
        {unlocked && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" aria-hidden /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editId ? 'Edit announcement' : 'New announcement'}
                </DialogTitle>
                <DialogDescription>
                  Write the message exactly how it should be sent - line breaks and emojis are
                  kept when copied.
                </DialogDescription>
              </DialogHeader>
              {!editId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" aria-hidden /> Quick starters - tap
                    to fill the box
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {starterTemplates.map((t) => (
                      <button
                        key={t.label}
                        type="button"
                        onClick={() => setMessage(t.message)}
                        className="rounded-md border border-border bg-secondary/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="ann-message">Message</Label>
                <Textarea
                  id="ann-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  placeholder={"🚨 No stream tonight, y'all.\n💜 He'll see everyone tomorrow night!"}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnDashboard}
                  onChange={(e) => setShowOnDashboard(e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
                Also show it on the Dashboard
              </label>
              <DialogFooter>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? 'Saving…' : editId ? 'Save changes' : 'Add announcement'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading && announcements === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No announcements yet{unlocked ? ' - add your first one.' : '.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((a) => (
            <Card key={a.id} className={a.active ? 'border-primary/60' : undefined}>
              <CardContent className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Megaphone className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      a.active
                        ? 'bg-green-500/15 text-green-400 border-green-500/40'
                        : 'bg-muted text-muted-foreground border-border'
                    )}
                  >
                    {a.active ? 'On Dashboard' : 'Library only'}
                  </Badge>
                </div>

                <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {a.message}
                </p>

                <Button
                  onClick={() => copy(a.id, a.message)}
                  className={cn('w-full gap-2', copiedId === a.id && 'opacity-80')}
                  variant={copiedId === a.id ? 'outline' : 'default'}
                >
                  {copiedId === a.id ? (
                    <>
                      <Check className="h-4 w-4 text-green-400" aria-hidden /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" aria-hidden /> Copy message
                    </>
                  )}
                </Button>

                {unlocked && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={() => patch(a.id, { active: !a.active })}
                    >
                      {a.active ? (
                        <>
                          <MegaphoneOff className="h-3.5 w-3.5" aria-hidden /> Hide from Dashboard
                        </>
                      ) : (
                        <>
                          <Megaphone className="h-3.5 w-3.5" aria-hidden /> Show on Dashboard
                        </>
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label="Edit announcement"
                      onClick={() => openEdit(a)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label="Delete announcement"
                      onClick={() => remove(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {timeAgo(a.createdAt)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
