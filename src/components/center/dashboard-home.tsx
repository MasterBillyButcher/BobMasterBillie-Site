'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Announcement, ActivityLog, BacklogEvent, Movie, Prediction, Veto, VipMember } from '@/lib/types'
import { useData, timeAgo, copyText } from '@/hooks/use-data'
import { predictionSetupText, optionLines } from '@/lib/prediction-format'
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
  Vote,
  Zap,
  ShieldBan,
  Star,
  TrainFront,
  Gift,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TabId } from '@/components/center/tab-types'

const dashboardCategoryMeta: Record<
  string,
  { label: string; icon: typeof TrainFront }
> = {
  hype: { label: 'Hype Train', icon: TrainFront },
  treasure: { label: 'Treasure Train', icon: Gift },
  satta: { label: 'SATTA LIVE', icon: Target },
  babu: { label: 'Babu Watch', icon: Clock },
  custom: { label: 'Custom', icon: Sparkles },
}

// Same color language as the Activity Log - dashboard dots match type colors.
const dashboardTypeColors: Record<string, string> = {
  movie: 'bg-yellow-400',
  prediction: 'bg-primary',
  veto: 'bg-red-400',
  vip: 'bg-amber-300',
  backlog: 'bg-amber-400',
  announcement: 'bg-green-400',
  stream: 'bg-orange-400',
  custom: 'bg-muted-foreground/60',
}

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
  const { data: vetoes } = useData<Veto[]>('/api/vetoes', 15000)
  const { data: vips } = useData<VipMember[]>('/api/vips', 15000)
  const { toast } = useToast()

  // The date renders after mount so server and client markup always match.
  const [dateReady, setDateReady] = useState(false)
  useEffect(() => {
    setDateReady(true)
  }, [])

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

  // Movie night spotlight - real data, nothing shown when the list is empty
  const watchingMovie = (movies ?? []).find((m) => m.status === 'watching') ?? null
  const nextPlanned =
    (movies ?? [])
      .filter((m) => m.status === 'planned' && m.plannedDate)
      .sort((a, b) => String(a.plannedDate).localeCompare(String(b.plannedDate)))[0] ?? null

  // Today's tally - everything recorded on today's date, with the net movement.
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayEvents = (backlogEvents ?? []).filter(
    (e) => format(new Date(e.occurredAt), 'yyyy-MM-dd') === todayStr
  )
  const todayDelta = todayEvents.reduce((sum, e) => sum + e.delta, 0)
  const lastEvent = (backlogEvents ?? [])[0] ?? null
  const readyPredictions = (predictions ?? []).filter((p) => p.status === 'ready').length
  const totalVetoRights = (vetoes ?? []).reduce((sum, v) => sum + v.vetoRights, 0)
  const pulse = [
    {
      label: 'Predictions ready',
      value: readyPredictions,
      hint: 'copy-paste setups waiting',
      icon: Vote,
      tab: 'predictions' as TabId,
    },
    {
      label: 'Live announcements',
      value: activeAnnouncements.length,
      hint: 'showing on this page',
      icon: Megaphone,
      tab: 'announcements' as TabId,
    },
    {
      label: 'Veto rights in play',
      value: totalVetoRights,
      hint: `${(vetoes ?? []).length} viewer${(vetoes ?? []).length === 1 ? '' : 's'} on the board`,
      icon: ShieldBan,
      tab: 'veto' as TabId,
    },
    {
      label: 'VIP members',
      value: (vips ?? []).length,
      hint: 'tracked on the VIP board',
      icon: Star,
      tab: 'vip' as TabId,
    },
  ]

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

  // Dashboard copy - announcements are write-once, read-often, copy-anywhere.
  async function copyAnnouncement(a: Announcement) {
    const ok = await copyText(a.message)
    if (ok) {
      setCopiedId(`ann-${a.id}`)
      toast({
        title: 'Announcement copied',
        description: 'Paste it into Twitch or Discord.',
      })
      setTimeout(() => setCopiedId(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
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
      {/* Hero - every visitor lands on the action in one glance */}
      <section className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden /> Command Center
            {dateReady && (
              <span className="text-muted-foreground">
                · {format(new Date(), 'EEE, MMM d · HH:mm')}
              </span>
            )}
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl leading-tight tracking-wide sm:text-4xl">
            Everything for the stream, one tap away.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            The backlog count keeps the balance: +1 for every bits goal, -1 for every movie
            watched.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button size="lg" className="gap-2" asChild>
              <a
                href="https://twitch.tv/bobmasterbillie"
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch on Twitch
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => onNavigate('predictions')}>
              Ready prediction setups
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </section>

      {/* Live pulse - real counts from the database, one click to jump in */}
      <section aria-label="Live pulse" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {pulse.map((p) => {
          const Icon = p.icon
          return (
            <button key={p.label} onClick={() => onNavigate(p.tab)} className="text-left">
              <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
                <CardContent className="flex h-full items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-2xl tracking-wide tabular-nums">{p.value}</p>
                    <p className="truncate text-xs font-medium">{p.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.hint}</p>
                  </div>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </section>

      {/* Movie night spotlight - hidden when nothing is watching or scheduled */}
      {(watchingMovie || nextPlanned) && (
        <button onClick={() => onNavigate('movies')} className="block w-full text-left">
          <Card className="border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg">
            <CardContent className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Clapperboard className="h-6 w-6 text-primary" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {watchingMovie ? 'Now watching' : 'Movie night'}
                </p>
                <p className="mt-0.5 truncate font-display text-xl tracking-wide">
                  {watchingMovie ? watchingMovie.title : nextPlanned?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {watchingMovie
                    ? 'Live on stream right now'
                    : `Next up${nextPlanned?.plannedDate ? ` - ${format(new Date(nextPlanned.plannedDate + 'T00:00:00'), 'EEE, MMM d')}` : ''}`}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            </CardContent>
          </Card>
        </button>
      )}

      {/* Backlog stats (top) */}
      <section aria-label="Backlog stats" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <button key={s.label} onClick={() => onNavigate('movies')} className="text-left">
            <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/30 hover:shadow-lg">
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
          <p className="rounded-md border border-border/60 bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Today ({format(new Date(), 'EEE, MMM d')}):</span>{' '}
            {todayEvents.length === 0
              ? `nothing recorded yet${lastEvent ? ` - last event ${timeAgo(lastEvent.occurredAt)}` : ' - your first tap starts the count'}.`
              : `${todayEvents.length} event${todayEvents.length === 1 ? '' : 's'} recorded, net ${signed(todayDelta)}.`}
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

      {/* Announcements - latest three, the section disappears when nothing is live */}
      {activeAnnouncements.length > 0 && (
        <section aria-label="Announcements" className="space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="text-sm font-semibold tracking-tight">
              Announcements
              <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-normal tabular-nums text-muted-foreground">
                {activeAnnouncements.length} live
              </span>
            </h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {activeAnnouncements.slice(0, 3).map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {a.message}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      aria-label="Copy announcement"
                      onClick={() => copyAnnouncement(a)}
                    >
                      {copiedId === `ann-${a.id}` ? (
                        <Check className="h-3.5 w-3.5 text-green-400" aria-hidden />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {activeAnnouncements.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => onNavigate('announcements')}
            >
              All {activeAnnouncements.length} announcements
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </section>
      )}

      {/* Pinned predictions + recent logs */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-muted-foreground" aria-hidden /> Ready to start
              {pinnedPredictions.length > 0 && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {pinnedPredictions.length}
                </span>
              )}
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
              pinnedPredictions.map((p) => {
                const cat = dashboardCategoryMeta[p.category] ?? dashboardCategoryMeta.custom
                const CatIcon = cat.icon
                const optionCount = optionLines(p.options).length
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CatIcon className="h-3 w-3" aria-hidden /> {cat.label} ·{' '}
                        {optionLines(p.options).slice(0, 2).join(' vs ') ||
                          `${optionCount} option${optionCount === 1 ? '' : 's'}`} · {p.duration}
                      </p>
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
                )
              })
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
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        dashboardTypeColors[log.type] ?? 'bg-muted-foreground/60'
                      )}
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
