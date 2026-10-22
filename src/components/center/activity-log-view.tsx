'use client'

import { useState } from 'react'
import { ActivityLog } from '@/lib/types'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ScrollText, Plus, Pin, PinOff, Trash2, Clapperboard, Vote, ShieldBan, Star, Megaphone, Radio, Sparkles, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

const typeMeta: Record<
  ActivityLog['type'],
  { label: string; icon: typeof ScrollText; className: string }
> = {
  movie: { label: 'Movie', icon: Clapperboard, className: 'text-yellow-400' },
  prediction: { label: 'Prediction', icon: Vote, className: 'text-primary' },
  veto: { label: 'Veto', icon: ShieldBan, className: 'text-red-400' },
  vip: { label: 'VIP', icon: Star, className: 'text-amber-300' },
  backlog: { label: 'Backlog', icon: Scale, className: 'text-amber-400' },
  announcement: { label: 'Announcement', icon: Megaphone, className: 'text-green-400' },
  stream: { label: 'Stream', icon: Radio, className: 'text-orange-400' },
  custom: { label: 'Note', icon: Sparkles, className: 'text-muted-foreground' },
}

const actionMeta: Record<ActivityLog['action'], string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'removed',
  note: 'logged',
  scheduled: 'scheduled',
}

const filterTypes = ['all', 'movie', 'prediction', 'veto', 'vip', 'backlog', 'announcement', 'stream', 'custom'] as const

export default function ActivityLogView() {
  const { data: logs, loading, refetch } = useData<ActivityLog[]>(
    '/api/logs?limit=200',
    10000
  )
  const { toast } = useToast()

  const [filter, setFilter] = useState<(typeof filterTypes)[number]>('all')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [type, setType] = useState('stream')
  const [submitting, setSubmitting] = useState(false)

  const list = (logs ?? []).filter((l) => filter === 'all' || l.type === filter)

  async function addLog() {
    if (!title.trim()) {
      toast({ title: 'Give the log a title', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, details, type }),
      })
      if (!res.ok) throw new Error('Failed')
      setTitle('')
      setDetails('')
      setOpen(false)
      toast({ title: 'Update logged' })
      refetch()
    } catch {
      toast({ title: 'Could not log update', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function togglePin(log: ActivityLog) {
    try {
      const res = await fetch(`/api/logs/${log.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !log.pinned }),
      })
      if (!res.ok) throw new Error('Failed')
      refetch()
    } catch {
      toast({ title: 'Pin failed', variant: 'destructive' })
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Log entry deleted' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Activity Log</h2>
          <p className="text-sm text-muted-foreground">
            Every log and every update - auto-captured changes plus your manual notes.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" aria-hidden /> Log an Update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a manual update</DialogTitle>
              <DialogDescription>
                e.g. “No stream tonight” or “The Notebook completed - Bits Goal”.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="log-title">Title</Label>
                <Input
                  id="log-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What happened?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="log-details">Details (optional)</Label>
                <Textarea
                  id="log-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Add context…"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger aria-label="Log type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stream">Stream</SelectItem>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="prediction">Prediction</SelectItem>
                    <SelectItem value="veto">Veto</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="custom">Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addLog} disabled={submitting}>
                {submitting ? 'Logging…' : 'Add to Log'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTypes.map((t) => (
          <Button
            key={t}
            size="sm"
            variant={filter === t ? 'default' : 'outline'}
            className={cn('h-8 capitalize', filter === t && 'text-primary-foreground')}
            onClick={() => setFilter(t)}
          >
            {t === 'all' ? 'All' : typeMeta[t].label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {list.length} entr{list.length === 1 ? 'y' : 'ies'}
        </span>
      </div>

      {/* Timeline */}
      {loading && logs === null ? (
        <div className="space-y-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nothing here yet - log an update or make a change anywhere in the app.
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-3 before:absolute before:bottom-2 before:left-[19px] before:top-2 before:w-px before:bg-border">
          {list.map((log) => {
            const meta = typeMeta[log.type] ?? typeMeta.custom
            const Icon = meta.icon
            return (
              <div key={log.id} className="relative flex gap-3">
                <span
                  className={cn(
                    'z-10 mt-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card',
                    meta.className
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <Card
                  className={cn(
                    'flex-1',
                    log.pinned && 'border-primary/60'
                  )}
                >
                  <CardContent className="space-y-1 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{log.title}</p>
                      <div className="flex items-center gap-1">
                        {log.pinned && (
                          <Badge variant="outline" className="border-primary/40 text-primary">
                            Pinned
                          </Badge>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          aria-label={log.pinned ? 'Unpin entry' : 'Pin entry'}
                          onClick={() => togglePin(log)}
                        >
                          {log.pinned ? (
                            <PinOff className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Pin className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          aria-label="Delete log entry"
                          onClick={() => remove(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                    {log.details && (
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      <span className="capitalize">{meta.label}</span> ·{' '}
                      {actionMeta[log.action] ?? log.action} · {timeAgo(log.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
