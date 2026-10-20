'use client'

import { useMemo, useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from 'date-fns'
import { Movie, ActivityLog } from '@/lib/types'
import { useData, timeAgo } from '@/hooks/use-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  PlayCircle,
  Check,
} from 'lucide-react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const chipClass: Record<string, string> = {
  planned: 'bg-secondary text-secondary-foreground border-border',
  watching: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  watched: 'bg-green-500/10 text-green-300 border-green-500/30',
}

const badgeClass: Record<string, string> = {
  planned: 'bg-muted text-muted-foreground border-border',
  watching: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  watched: 'bg-green-500/10 text-green-400 border-green-500/30',
}

/**
 * Self-contained movie calendar - fetches movies + logs, renders the month grid,
 * a day-detail panel (movies + updates of that date) and a "plan a movie this day" dialog.
 * Used at the bottom of the Dashboard and inside the Movie Backlog tab.
 */
export default function CalendarSection({
  heading,
  className,
}: {
  heading?: string
  className?: string
}) {
  const { data: movies, loading, refetch } = useData<Movie[]>('/api/movies', 10000)
  const { data: logs } = useData<ActivityLog[]>('/api/logs?limit=300', 30000)
  const { toast } = useToast()

  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // plan-a-movie dialog
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('planned')
  const [plannedDate, setPlannedDate] = useState('')
  const [watchedDate, setWatchedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const list = movies ?? []

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthCursor))
    const end = endOfWeek(endOfMonth(monthCursor))
    return eachDayOfInterval({ start, end })
  }, [monthCursor])

  function moviesOn(day: Date): Movie[] {
    return list.filter(
      (m) =>
        (m.plannedDate && isSameDay(parseISO(m.plannedDate), day)) ||
        (m.watchedDate && isSameDay(parseISO(m.watchedDate), day))
    )
  }

  function logsOn(day: Date): ActivityLog[] {
    return (logs ?? []).filter((l) => isSameDay(new Date(l.createdAt), day))
  }

  async function planMovie() {
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
          notes: notes || undefined,
          plannedDate: status !== 'watched' && plannedDate ? plannedDate : null,
          watchedDate: status === 'watched' ? watchedDate || plannedDate || null : null,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setTitle('')
      setNotes('')
      setOpen(false)
      toast({ title: 'Movie scheduled on the calendar' })
      refetch()
    } catch {
      toast({ title: 'Could not schedule the movie', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  function openAddForDay(day: Date) {
    setPlannedDate(format(day, 'yyyy-MM-dd'))
    setWatchedDate('')
    setStatus('planned')
    setTitle('')
    setNotes('')
    setOpen(true)
  }

  const dayMovies = selectedDay ? moviesOn(selectedDay) : []
  const dayLogs = selectedDay ? logsOn(selectedDay) : []

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {heading ?? 'Movie Calendar'}
            </h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1"
            onClick={() => {
              const today = new Date()
              setMonthCursor(startOfMonth(today))
              setSelectedDay(today)
            }}
          >
            Today
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label="Previous month"
            onClick={() => setMonthCursor(subMonths(monthCursor, 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <p className="text-base font-bold sm:text-lg">{format(monthCursor, 'MMMM yyyy')}</p>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            aria-label="Next month"
            onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
            >
              {d}
            </div>
          ))}
          {loading && movies === null
            ? Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md sm:h-20" />
              ))
            : days.map((day) => {
                const inMonth = isSameMonth(day, monthCursor)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const dayMovieCount = moviesOn(day).length
                const dayLogCount = logsOn(day).length
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    aria-label={`Movies and updates for ${format(day, 'PPP')}`}
                    aria-pressed={!!isSelected}
                    className={cn(
                      'flex h-16 flex-col gap-0.5 rounded-md border p-1 text-left transition-colors sm:h-20 sm:gap-1 sm:p-1.5',
                      inMonth
                        ? 'border-border/60 bg-card'
                        : 'border-transparent bg-card/40 opacity-45',
                      isSelected && 'border-primary ring-1 ring-primary',
                      isToday(day) && inMonth && 'border-primary/50'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        isToday(day) ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                      {moviesOn(day)
                        .slice(0, 2)
                        .map((m) => (
                          <span
                            key={m.id}
                            className={cn(
                              'truncate rounded border px-1 py-px text-[9px] font-medium leading-tight sm:text-[10px]',
                              chipClass[m.status] ?? chipClass.planned
                            )}
                          >
                            {m.title}
                          </span>
                        ))}
                      {dayMovieCount > 2 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{dayMovieCount - 2} more
                        </span>
                      )}
                      {!dayMovieCount && dayLogCount > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
                          <ScrollText className="h-2.5 w-2.5" aria-hidden />
                          {dayLogCount} update{dayLogCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{format(selectedDay, 'EEEE, MMMM d, yyyy')}</p>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1"
                onClick={() => openAddForDay(selectedDay)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden /> Plan a movie this day
              </Button>
            </div>
            {dayMovies.length === 0 && dayLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing planned or logged on this date yet.
              </p>
            ) : (
              <div className="space-y-2">
                {dayMovies.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{m.title}</span>
                    <Badge
                      variant="outline"
                      className={badgeClass[m.status] ?? badgeClass.planned}
                    >
                      {m.plannedDate && isSameDay(parseISO(m.plannedDate), selectedDay)
                        ? m.status === 'watching'
                          ? 'Watching'
                          : 'Planned'
                        : 'Watched'}
                    </Badge>
                  </div>
                ))}
                {dayLogs.map((l) => (
                  <div key={l.id} className="rounded-md bg-card px-3 py-2 text-sm">
                    <span className="font-medium">{l.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {l.type} · {timeAgo(l.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan-a-movie dialog */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule a movie</DialogTitle>
              <DialogDescription>
                {plannedDate
                  ? `Planning for ${format(parseISO(plannedDate), 'MMMM d, yyyy')}.`
                  : 'Pick a status and date - it shows up on the calendar.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cal-movie-title">Title</Label>
                <Input
                  id="cal-movie-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Manzil"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => {
                      setStatus(v)
                      if (v !== 'watched') setWatchedDate('')
                    }}
                  >
                    <SelectTrigger aria-label="Status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="watching">Watching</SelectItem>
                      <SelectItem value="watched">Watched</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {status === 'watched' ? (
                  <div className="space-y-2">
                    <Label htmlFor="cal-watched">Watched on</Label>
                    <Input
                      id="cal-watched"
                      type="date"
                      value={watchedDate || plannedDate}
                      onChange={(e) => setWatchedDate(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="cal-planned">Date</Label>
                    <Input
                      id="cal-planned"
                      type="date"
                      value={plannedDate}
                      onChange={(e) => setPlannedDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cal-notes">Update note (optional)</Label>
                <Textarea
                  id="cal-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. backlog -1 (watched) · +1 (bits goal)"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Marking a movie <span className="text-foreground">watched</span> automatically adds
                a <span className="text-green-400">-1</span> to the backlog count.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={planMovie} disabled={submitting}>
                {submitting ? 'Saving…' : 'Save to calendar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
