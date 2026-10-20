'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Announcement, ActivityLog, BacklogEvent, Movie, Prediction } from '@/lib/types'
import { useData, timeAgo, copyText } from '@/hooks/use-data'
import { predictionSetupText } from '@/lib/prediction-format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import CalendarSection from '@/components/center/calendar-section'
import {
  Megaphone,
  Target,
  Clapperboard,
  CheckCircle2,
  ScrollText,
  ArrowRight,
  Copy,
  Check,
  Plus,
  Minus,
  Pencil,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabId } from '@/components/center/tab-types'

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

export default function DashboardHome({
  onNavigate,
}: {
  onNavigate: (tab: TabId) => void
}) {
  const { data: predictions } = useData<Prediction[]>('/api/predictions', 15000)
  const { data: movies } = useData<Movie[]>('/api/movies', 15000)
  const { data: backlogEvents, refetch: refetchEvents } = useData<BacklogEvent[]>(
    '/api/backlog-events',
    15000
  )
  const { data: logs } = useData<ActivityLog[]>('/api/logs?limit=100', 15000)
  const { data: announcements } = useData<Announcement[]>('/api/announcements', 15000)
  const { toast } = useToast()

  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [quickBusy, setQuickBusy] = useState<'bits_goal' | 'watched' | null>(null)

  // add-event-with-details dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState<'bits_goal' | 'watched'>('bits_goal')
  const [addNote, setAddNote] = useState('')
  const [addDate, setAddDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [addMovieTitle, setAddMovieTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // edit-event dialog
  const [editId, setEditId] = useState<string | null>(null)
  const [editType, setEditType] = useState<'bits_goal' | 'watched'>('bits_goal')
  const [editNote, setEditNote] = useState('')
  const [editDate, setEditDate] = useState('')

  const activeAnnouncements = (announcements ?? []).filter((a) => a.active)
  const pinnedPredictions = (predictions ?? []).filter((p) => p.pinned && p.status === 'ready')
  const toWatchCount = (movies ?? []).filter(
    (m) => m.status === 'planned' || m.status === 'watching'
  ).length
  const watchedCount = (movies ?? []).filter((m) => m.status === 'watched').length
  const goalCount = (backlogEvents ?? []).filter((e) => e.delta > 0).length
  const watchedEventCount = (backlogEvents ?? []).filter((e) => e.delta < 0).length
  const backlogCount = (backlogEvents ?? []).reduce((sum, e) => sum + e.delta, 0)
  const recentLogs = (logs ?? []).slice(0, 6)
  const recentEvents = (backlogEvents ?? []).slice(0, 6)

  async function quickCopy(p: Prediction) {
    const ok = await copyText(predictionSetupText(p))
    if (ok) {
      setCopiedId(p.id)
      toast({
        title: 'Prediction setup copied',
        description: 'Ready to start - paste it into Twitch.',
      })
      setTimeout(() => setCopiedId(null), 1600)
    } else {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access. Copy the fields manually.',
        variant: 'destructive',
      })
    }
  }

  // One-tap record - today's date is added automatically by the API.
  async function quickAdd(type: 'bits_goal' | 'watched') {
    setQuickBusy(type)
    try {
      const res = await fetch('/api/backlog-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({
        title: type === 'bits_goal' ? 'Backlog +1 recorded' : 'Backlog -1 recorded',
        description: `Logged for ${format(new Date(), 'MMM d, yyyy')}.`,
      })
      refetchEvents()
    } catch {
      toast({ title: 'Could not record the event', variant: 'destructive' })
    } finally {
      setQuickBusy(null)
    }
  }

  async function addEvent() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/backlog-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addType,
          note: addNote || undefined,
          occurredAt: addDate,
          movieTitle: addType === 'bits_goal' && addMovieTitle ? addMovieTitle : undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setAddNote('')
      setAddMovieTitle('')
      setAddOpen(false)
      toast({
        title: addType === 'bits_goal' ? 'Backlog +1 recorded' : 'Backlog -1 recorded',
      })
      refetchEvents()
    } catch {
      toast({ title: 'Could not record the event', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function patchEvent(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/backlog-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      refetchEvents()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  async function removeEvent(id: string) {
    try {
      const res = await fetch(`/api/backlog-events/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Event removed' })
      refetchEvents()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  function openEdit(e: BacklogEvent) {
    setEditId(e.id)
    setEditType(e.type)
    setEditNote(e.note ?? '')
    setEditDate(format(new Date(e.occurredAt), 'yyyy-MM-dd'))
  }

  function openAdd(type: 'bits_goal' | 'watched') {
    setAddType(type)
    setAddNote('')
    setAddMovieTitle('')
    setAddDate(format(new Date(), 'yyyy-MM-dd'))
    setAddOpen(true)
  }

  const stats = [
    {
      label: 'Backlog Count',
      value: signed(backlogCount),
      hint: `${goalCount} goals earned · ${watchedEventCount} watched`,
      valueClass:
        backlogCount > 0
          ? 'text-green-400'
          : backlogCount < 0
            ? 'text-red-400'
            : 'text-foreground',
    },
    {
      label: 'Movies to Watch',
      value: String(toWatchCount),
      hint: 'planned & watching',
      valueClass: 'text-foreground',
    },
    {
      label: 'Movies Watched',
      value: String(watchedCount),
      hint: 'all time',
      valueClass: 'text-foreground',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <section>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The backlog count keeps the balance: +1 for every bits goal completed, -1 for every
          movie watched, so you never watch more or less than expected.
        </p>
      </section>

      {/* Backlog stats (top) */}
      <section aria-label="Backlog stats" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <button key={s.label} onClick={() => onNavigate('movies')} className="text-left">
            <Card className="h-full transition-colors hover:border-muted-foreground/30">
              <CardContent className="flex h-full flex-col gap-1 p-4">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <span className={cn('font-display text-4xl tracking-wide tabular-nums', s.valueClass)}>
                  {s.value}
                </span>
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </CardContent>
            </Card>
          </button>
        ))}
      </section>

      {/* Backlog tracker - one-tap +/- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backlog Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-3">
              <span
                className={cn(
                  'font-display text-5xl tracking-wide tabular-nums',
                  backlogCount > 0
                    ? 'text-green-400'
                    : backlogCount < 0
                      ? 'text-red-400'
                      : 'text-foreground'
                )}
              >
                {signed(backlogCount)}
              </span>
              <div className="text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-green-400">+1</span> bits goal completed (a
                  movie earned)
                </p>
                <p>
                  <span className="font-medium text-red-400">-1</span> movie watched - count 0
                  means exactly on target
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                className="gap-1.5 bg-green-600 text-white hover:bg-green-600/90"
                disabled={quickBusy !== null}
                onClick={() => quickAdd('bits_goal')}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {quickBusy === 'bits_goal' ? 'Recording…' : '+1 Bits goal'}
              </Button>
              <Button
                variant="outline"
                className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                disabled={quickBusy !== null}
                onClick={() => quickAdd('watched')}
              >
                <Minus className="h-4 w-4" aria-hidden />
                {quickBusy === 'watched' ? 'Recording…' : '-1 Movie watched'}
              </Button>
              <Button variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => openAdd('bits_goal')}>
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                With details
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            One tap records the event - today&apos;s date is added automatically. Mark a movie
            watched in the Movie Backlog and its -1 is tracked by itself.
          </p>

          {backlogEvents === null ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No backlog events yet - tap +1 to record the first bits goal.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {recentEvents.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                  <span
                    className={cn(
                      'w-9 shrink-0 text-center text-sm font-semibold tabular-nums',
                      e.delta > 0 ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {e.delta > 0 ? '+1' : '-1'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {e.note ?? (e.type === 'bits_goal' ? 'Bits goal completed' : 'Movie watched')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(e.occurredAt), 'MMM d, yyyy')} · {timeAgo(e.occurredAt)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    aria-label="Edit event"
                    onClick={() => openEdit(e)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Delete event"
                    onClick={() => removeEvent(e.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Announcements */}
      <section aria-label="Announcements" className="space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">Announcements</h3>
        </div>
        {activeAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No active announcements right now.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {activeAnnouncements.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <p className="text-sm leading-relaxed">{a.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Pinned predictions + recent logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-muted-foreground" aria-hidden /> Ready to start
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('predictions')}>
              All <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {predictions === null ? (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : pinnedPredictions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pinned predictions. Pin one in the Predictions tab.
              </p>
            ) : (
              pinnedPredictions.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.duration}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                    aria-label={`Copy ${p.title} setup`}
                    onClick={() => quickCopy(p)}
                  >
                    {copiedId === p.id ? (
                      <Check className="h-4 w-4 text-green-400" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="h-4 w-4 text-muted-foreground" aria-hidden /> Latest Updates
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('logs')}>
              Full log <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
            </Button>
          </CardHeader>
          <CardContent>
            {logs === null ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex gap-3">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{log.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.type} · {log.action} · {timeAgo(log.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Movie calendar (bottom) */}
      <CalendarSection heading="Movie Calendar" />

      {/* Add event dialog (with details) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addType === 'bits_goal' ? 'Backlog +1: bits goal completed' : 'Backlog -1: movie watched'}
            </DialogTitle>
            <DialogDescription>
              Add a note, the earned movie, or a different date. Otherwise one-tap on the
              tracker is faster: the date is added for you.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={addType} onValueChange={(v) => setAddType(v as 'bits_goal' | 'watched')}>
                <SelectTrigger aria-label="Event type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bits_goal">Bits goal completed (+1)</SelectItem>
                  <SelectItem value="watched">Movie watched (-1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addType === 'bits_goal' && (
              <div className="space-y-2">
                <Label htmlFor="event-movie">Movie earned (optional - adds it to planned)</Label>
                <Input
                  id="event-movie"
                  value={addMovieTitle}
                  onChange={(e) => setAddMovieTitle(e.target.value)}
                  placeholder="e.g. Dil Bechara"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-note">Note (optional)</Label>
              <Input
                id="event-note"
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder={
                  addType === 'bits_goal'
                    ? 'e.g. 500 bits goal hit by @user'
                    : 'e.g. watched Manzil on stream'
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addEvent} disabled={submitting}>
              {submitting ? 'Saving…' : 'Record event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit event dialog */}
      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit backlog event</DialogTitle>
            <DialogDescription>
              Change the event type, note or date - the count updates instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Event type</Label>
              <Select value={editType} onValueChange={(v) => setEditType(v as 'bits_goal' | 'watched')}>
                <SelectTrigger aria-label="Event type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bits_goal">Bits goal completed (+1)</SelectItem>
                  <SelectItem value="watched">Movie watched (-1)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-note">Note</Label>
              <Input
                id="edit-event-note"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-date">Date</Label>
              <Input
                id="edit-event-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (!editId) return
                patchEvent(editId, {
                  type: editType,
                  note: editNote,
                  occurredAt: editDate,
                })
                setEditId(null)
                toast({ title: 'Event updated' })
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
