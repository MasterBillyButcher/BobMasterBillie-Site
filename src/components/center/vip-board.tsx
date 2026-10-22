'use client'

import { useState } from 'react'
import { VipMember, VipEvent } from '@/lib/types'
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
import {
  Star,
  UserPlus,
  Trash2,
  CalendarClock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RotateCcw,
} from 'lucide-react'

const statusMeta: Record<VipMember['status'], { label: string; className: string }> = {
  active: { label: 'VIP', className: 'bg-primary/10 text-primary border-primary/30' },
  probation: {
    label: 'One more chance',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  },
  revoked: { label: 'Revoked', className: 'bg-red-500/10 text-red-400 border-red-500/30' },
}

const eventMeta: Record<VipEvent['eventType'], { label: string; icon: typeof Star; className: string }> = {
  granted: { label: 'granted VIP', icon: ShieldCheck, className: 'text-primary' },
  returned: { label: 'earned VIP back', icon: RotateCcw, className: 'text-green-400' },
  probation: { label: 'moved to probation', icon: ShieldAlert, className: 'text-yellow-400' },
  revoked: { label: 'VIP revoked', icon: ShieldX, className: 'text-red-400' },
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function VipBoard() {
  const { data: members, loading, refetch } = useData<VipMember[]>('/api/vips', 10000)
  const { data: events, refetch: refetchEvents } = useData<VipEvent[]>('/api/vip-events', 10000)
  const { toast } = useToast()

  // add member dialog
  const [addOpen, setAddOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState('active')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // monthly event dialog
  const [eventOpen, setEventOpen] = useState(false)
  const [eventUser, setEventUser] = useState('')
  const [eventType, setEventType] = useState('granted')
  const [eventNote, setEventNote] = useState('')
  const [eventSubmitting, setEventSubmitting] = useState(false)

  async function addMember() {
    if (!username.trim()) {
      toast({ title: 'Username is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/vips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, status, note }),
      })
      if (!res.ok) throw new Error('Failed')
      setUsername('')
      setNote('')
      setStatus('active')
      setAddOpen(false)
      toast({ title: 'VIP member added' })
      refetch()
      refetchEvents()
    } catch {
      toast({ title: 'Could not add member', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function runMonthlyEvent() {
    if (!eventUser.trim()) {
      toast({ title: 'Username is required', variant: 'destructive' })
      return
    }
    setEventSubmitting(true)
    try {
      const res = await fetch('/api/vip-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: eventUser,
          eventType,
          note: eventNote || `Monthly VIP Event - ${monthLabel(currentMonth())}`,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setEventUser('')
      setEventNote('')
      setEventType('granted')
      setEventOpen(false)
      toast({ title: 'Monthly VIP Event logged' })
      refetch()
      refetchEvents()
    } catch {
      toast({ title: 'Could not log event', variant: 'destructive' })
    } finally {
      setEventSubmitting(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/vips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed')
      refetch()
      refetchEvents()
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' })
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/vips/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'VIP member removed' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  // group events by month
  const grouped: Record<string, VipEvent[]> = {}
  for (const ev of events ?? []) {
    grouped[ev.month] = grouped[ev.month] ?? []
    grouped[ev.month].push(ev)
  }
  const months = Object.keys(grouped).sort().reverse()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">VIP Board</h2>
          <p className="text-sm text-muted-foreground">
            Separate from veto power - VIP members, monthly VIP events and full history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={eventOpen} onOpenChange={setEventOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarClock className="h-4 w-4" aria-hidden /> Monthly VIP Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Run monthly VIP event - {monthLabel(currentMonth())}</DialogTitle>
                <DialogDescription>
                  Grant VIP to a new person, give someone their one chance, or revoke. Logged to
                  this month’s history automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-user">Username</Label>
                  <Input
                    id="event-user"
                    value={eventUser}
                    onChange={(e) => setEventUser(e.target.value)}
                    placeholder="e.g. new_viewer_99"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger aria-label="VIP action">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="granted">Grant VIP</SelectItem>
                      <SelectItem value="returned">Earn VIP back (chance used well)</SelectItem>
                      <SelectItem value="probation">One more chance (probation)</SelectItem>
                      <SelectItem value="revoked">Revoke VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-note">Note (optional)</Label>
                  <Textarea
                    id="event-note"
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. Won the monthly community vote"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={runMonthlyEvent} disabled={eventSubmitting}>
                  {eventSubmitting ? 'Logging…' : 'Log VIP Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" aria-hidden /> Add VIP Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add VIP member</DialogTitle>
                <DialogDescription>
                  Adds the member and logs a {monthLabel(currentMonth())} VIP event.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vip-user">Username</Label>
                  <Input
                    id="vip-user"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mickey_17__"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger aria-label="VIP status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">VIP active</SelectItem>
                      <SelectItem value="probation">One more chance (probation)</SelectItem>
                      <SelectItem value="revoked">Revoked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vip-note">Note (optional)</Label>
                  <Input
                    id="vip-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. gets one more chance to earn VIP back"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addMember} disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add Member'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Members */}
      {loading && members === null ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (members ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No VIP members yet - add one or run the monthly VIP event.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(members ?? []).map((m) => {
            const meta = statusMeta[m.status] ?? statusMeta.active
            return (
              <Card key={m.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary">
                        <Star className="h-5 w-5 text-primary" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold">{m.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.grantedAt
                            ? `VIP since ${new Date(m.grantedAt).toLocaleDateString()}`
                            : 'not granted yet'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </div>

                  {m.note && <p className="text-sm text-muted-foreground">{m.note}</p>}

                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={m.status} onValueChange={(v) => patch(m.id, { status: v })}>
                      <SelectTrigger
                        className="h-8 flex-1 text-xs"
                        aria-label={`VIP status for ${m.username}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">VIP active</SelectItem>
                        <SelectItem value="probation">One more chance</SelectItem>
                        <SelectItem value="revoked">Revoked</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${m.username} from VIP board`}
                      onClick={() => remove(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* History grouped by month */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden /> VIP History by month
        </h3>
        {months.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No VIP events logged yet.
            </CardContent>
          </Card>
        ) : (
          months.map((month) => (
            <Card key={month}>
              <CardContent className="p-4">
                <p className="mb-3 text-sm font-bold text-primary">{monthLabel(month)}</p>
                <ul className="space-y-2">
                  {grouped[month].map((ev) => {
                    const meta = eventMeta[ev.eventType] ?? eventMeta.granted
                    const Icon = meta.icon
                    return (
                      <li key={ev.id} className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary ${meta.className}`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <span className="font-semibold">@{ev.username}</span>{' '}
                            <span className="text-muted-foreground">{meta.label}</span>
                          </p>
                          {ev.note && (
                            <p className="text-xs text-muted-foreground">{ev.note}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(ev.createdAt)}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
