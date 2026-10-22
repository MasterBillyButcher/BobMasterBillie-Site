'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { BacklogEvent, Movie } from '@/lib/types'
import { useData, timeAgo } from '@/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Clapperboard, Plus, Trash2, Check, PlayCircle, CalendarDays, Minus, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusMeta: Record<
  Movie['status'],
  { label: string; className: string; icon: typeof Clapperboard }
> = {
  planned: {
    label: 'Planned',
    className: 'bg-muted text-muted-foreground border-border',
    icon: CalendarDays,
  },
  watching: {
    label: 'Watching',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    icon: PlayCircle,
  },
  watched: {
    label: 'Watched',
    className: 'bg-green-500/10 text-green-400 border-green-500/30',
    icon: Check,
  },
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

export default function MoviePlanner() {
  const { data: movies, refetch } = useData<Movie[]>('/api/movies', 10000)
  const { data: backlogEvents, refetch: refetchEvents } = useData<BacklogEvent[]>(
    '/api/backlog-events',
    15000
  )
  const { toast } = useToast()
  const [quickBusy, setQuickBusy] = useState<'bits_goal' | 'watched' | null>(null)

  // add dialog
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('planned')
  const [plannedDate, setPlannedDate] = useState('')
  const [watchedDate, setWatchedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const list = movies ?? []
  const toWatchCount = list.filter((m) => m.status === 'planned' || m.status === 'watching').length
  const watchedCount = list.filter((m) => m.status === 'watched').length
  const backlogCount = (backlogEvents ?? []).reduce((sum, e) => sum + e.delta, 0)

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

  async function addMovie() {
    if (!title.trim()) {
      toast({ title: 'Movie title is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          status,
          notes,
          plannedDate: status !== 'watched' ? plannedDate || null : null,
          watchedDate: status === 'watched' ? watchedDate || null : null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setTitle('')
      setNotes('')
      setOpen(false)
      toast({ title: 'Movie added to the backlog' })
      refetch()
    } catch {
      toast({ title: 'Could not add movie', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/movies/${id}`, {
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
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Movie removed' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  function openAdd() {
    setPlannedDate('')
    setWatchedDate('')
    setStatus('planned')
    setTitle('')
    setNotes('')
    setOpen(true)
  }

  const stats = [
    {
      label: 'Backlog Count',
      value: signed(backlogCount),
      hint: '+1 bits goal · -1 watched',
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
      {/* Heading */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Movie Backlog</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planned, watching and watched - with a calendar for any day&apos;s movie updates.
          </p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" aria-hidden /> Add Movie
        </Button>
      </div>

      {/* Stats (top) */}
      <section aria-label="Backlog stats" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              <span className={cn('text-3xl font-semibold tabular-nums', s.valueClass)}>
                {s.value}
              </span>
              <span className="text-xs text-muted-foreground">{s.hint}</span>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Backlog tracker - one-tap +/- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backlog Tracker</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-green-400">+1</span> = bits goal completed (a
              movie earned) · <span className="font-medium text-red-400">-1</span> = movie watched
              · <span className="font-medium text-foreground">0</span> = exactly on target
            </p>
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
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Today&apos;s date is added automatically. Marking a movie watched below records its
            -1 by itself.
          </p>
        </CardContent>
      </Card>

      {/* Movie list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-tight">All movies</h3>
        {list.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No movies tracked yet - add the first one.
            </CardContent>
          </Card>
        ) : (
          list.map((m) => {
            const meta = statusMeta[m.status] ?? statusMeta.planned
            return (
              <Card key={m.id}>
                <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Clapperboard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <p className="font-medium">{m.title}</p>
                      <Badge variant="outline" className={meta.className}>
                        {meta.label}
                      </Badge>
                      {m.plannedDate && (
                        <Badge variant="outline" className="border-border text-muted-foreground">
                          {format(parseISO(m.plannedDate), 'MMM d')}
                        </Badge>
                      )}
                      {m.watchedDate && (
                        <Badge variant="outline" className="border-green-500/30 text-green-400">
                          {format(parseISO(m.watchedDate), 'MMM d')}
                        </Badge>
                      )}
                    </div>
                    {m.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{m.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      added {timeAgo(m.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Select value={m.status} onValueChange={(v) => patch(m.id, { status: v })}>
                      <SelectTrigger
                        className="h-8 w-[115px] text-xs"
                        aria-label={`Change status of ${m.title}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="watching">Watching</SelectItem>
                        <SelectItem value="watched">Watched</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      value={m.plannedDate ? format(parseISO(m.plannedDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) => patch(m.id, { plannedDate: e.target.value || null })}
                      className="h-8 w-[140px] text-xs"
                      aria-label={`Planned date for ${m.title}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${m.title}`}
                      onClick={() => remove(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Calendar (bottom) */}
      <CalendarSection heading="Calendar" />

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to the movie backlog</DialogTitle>
            <DialogDescription>
              Set it as planned (optionally with a calendar date) or log it as watched.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="movie-title">Title</Label>
              <Input
                id="movie-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Saiyaara"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => {
                  setStatus(v)
                  if (v !== 'planned') setPlannedDate('')
                  if (v !== 'watched') setWatchedDate('')
                }}
              >
                <SelectTrigger aria-label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="watching">Watching now</SelectItem>
                  <SelectItem value="watched">Watched</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'planned' && (
              <div className="space-y-2">
                <Label htmlFor="movie-planned">Planned date (optional - shows on calendar)</Label>
                <Input
                  id="movie-planned"
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                />
              </div>
            )}
            {status === 'watched' && (
              <div className="space-y-2">
                <Label htmlFor="movie-watched">Watched on</Label>
                <Input
                  id="movie-watched"
                  type="date"
                  value={watchedDate}
                  onChange={(e) => setWatchedDate(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="movie-notes">Daily update note (optional)</Label>
              <Textarea
                id="movie-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. -1 backlog, +1 backlog (bits goal)"
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Marking a movie <span className="text-foreground">watched</span> automatically adds
              a <span className="text-green-400">-1</span> to the backlog count; switching it
              back removes the -1 again.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={addMovie} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Movie'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
