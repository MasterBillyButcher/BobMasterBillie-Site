'use client'

import { useState } from 'react'
import { Prediction } from '@/lib/types'
import { useData, timeAgo, copyText } from '@/hooks/use-data'
import {
  predictionSetupText,
  optionLines,
  TWITCH_TITLE_MAX,
  TWITCH_OPTION_MAX,
} from '@/lib/prediction-format'
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
import { cn } from '@/lib/utils'
import {
  TrainFront,
  Gift,
  Target,
  Clock,
  Sparkles,
  Plus,
  Copy,
  Check,
  Pin,
  PinOff,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Pencil,
  ClipboardList,
} from 'lucide-react'

const categoryMeta: Record<
  Prediction['category'],
  { label: string; icon: typeof TrainFront }
> = {
  hype: { label: 'Hype Train', icon: TrainFront },
  treasure: { label: 'Treasure Train', icon: Gift },
  satta: { label: 'SATTA LIVE', icon: Target },
  babu: { label: 'Babu Watch', icon: Clock },
  custom: { label: 'Custom', icon: Sparkles },
}

export default function PredictionsBoard() {
  const { data: predictions, loading, refetch } = useData<Prediction[]>('/api/predictions', 10000)
  const { toast } = useToast()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // create dialog
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState('Yes\nNo')
  const [duration, setDuration] = useState('10 minutes')
  const [category, setCategory] = useState('custom')
  const [submitting, setSubmitting] = useState(false)

  // edit dialog
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editOptions, setEditOptions] = useState('')
  const [editDuration, setEditDuration] = useState('')

  async function copy(key: string, text: string, label: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopiedKey(key)
      toast({ title: `${label} copied`, description: 'Paste it into Twitch.' })
      setTimeout(() => setCopiedKey(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  async function createPrediction() {
    if (!title.trim()) {
      toast({ title: 'Question is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, options, duration, category }),
      })
      if (!res.ok) throw new Error('Failed')
      setTitle('')
      setOptions('Yes\nNo')
      setDuration('10 minutes')
      setCategory('custom')
      setOpen(false)
      toast({ title: 'Prediction ready to start' })
      refetch()
    } catch {
      toast({ title: 'Could not create prediction', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/predictions/${id}`, {
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
      const res = await fetch(`/api/predictions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Prediction deleted' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  function openEdit(p: Prediction) {
    setEditId(p.id)
    setEditTitle(p.title)
    setEditOptions(optionLines(p.options).join('\n'))
    setEditDuration(p.duration)
  }

  async function saveEdit() {
    if (!editId) return
    await patch(editId, {
      title: editTitle,
      options: editOptions,
      duration: editDuration,
    })
    setEditId(null)
    toast({ title: 'Prediction updated' })
  }

  const sorted = [...(predictions ?? [])].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Twitch Predictions</h2>
          <p className="text-sm text-muted-foreground">
            Ready-to-start setups — one copy gives you the command, title and options. Nothing
            extra.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" aria-hidden /> New Prediction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a prediction setup</DialogTitle>
              <DialogDescription>
                e.g. “Will Babu arrive before 00:00?” — you&apos;ll get one copy-paste block with
                the command, title and options.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pred-title">
                  Prediction title{' '}
                  <span
                    className={cn(
                      'ml-1 text-xs tabular-nums',
                      title.length > TWITCH_TITLE_MAX ? 'text-red-400' : 'text-muted-foreground'
                    )}
                  >
                    {title.length}/{TWITCH_TITLE_MAX}
                  </span>
                </Label>
                <Input
                  id="pred-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Will we complete Lvl 1 Hype Train?"
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pred-options">
                  Options (one per line — Twitch uses 2){' '}
                  <span className="ml-1 text-xs text-muted-foreground">
                    max {TWITCH_OPTION_MAX} chars each
                  </span>
                </Label>
                <Textarea
                  id="pred-options"
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="pred-duration">Prediction window</Label>
                  <Input
                    id="pred-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="10 minutes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger aria-label="Category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hype">Hype Train</SelectItem>
                      <SelectItem value="treasure">Treasure Train</SelectItem>
                      <SelectItem value="satta">SATTA LIVE</SelectItem>
                      <SelectItem value="babu">Babu Watch</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createPrediction} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Prediction'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading && predictions === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No predictions yet — create your first copy-paste setup.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((p) => {
            const meta = categoryMeta[p.category] ?? categoryMeta.custom
            const CatIcon = meta.icon
            const optionList = optionLines(p.options)
            const setup = predictionSetupText(p)
            return (
              <Card
                key={p.id}
                className={p.pinned ? 'border-primary/60' : undefined}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                        <CatIcon className="h-4 w-4 text-primary" aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {meta.label} · {p.duration}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        p.status === 'ready'
                          ? 'bg-green-500/15 text-green-400 border-green-500/40'
                          : 'bg-muted text-muted-foreground border-border'
                      }
                    >
                      {p.status === 'ready' ? 'Ready to start' : 'Used'}
                    </Badge>
                  </div>

                  {/* The one copy-paste block: ready to start */}
                  <div className="rounded-lg border border-border bg-secondary/40">
                    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Copy-paste — ready to start
                      </p>
                      <Button
                        size="sm"
                        className="h-7 gap-1 bg-primary text-primary-foreground"
                        aria-label="Copy full prediction setup"
                        onClick={() => copy(`${p.id}-full`, setup, 'Prediction setup')}
                      >
                        {copiedKey === `${p.id}-full` ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <Copy className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Copy setup
                      </Button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground">
                      {setup}
                    </pre>
                  </div>

                  {/* Per-field copies (paste straight into each Twitch form field) */}
                  <div className="space-y-1.5">
                    {(
                      [
                        {
                          key: 't',
                          label: 'Title',
                          value: p.title,
                          limit: TWITCH_TITLE_MAX,
                        },
                        ...optionList.slice(0, 2).map((o, i) => ({
                          key: `o${i}`,
                          label: `Option ${i + 1}`,
                          value: o,
                          limit: TWITCH_OPTION_MAX,
                        })),
                      ] as const
                    ).map((f) => (
                      <div
                        key={f.key}
                        className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-1.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {f.label}{' '}
                            <span
                              className={cn(
                                'ml-1 tabular-nums',
                                f.value.length > f.limit ? 'text-red-400' : ''
                              )}
                            >
                              {f.value.length}/{f.limit}
                            </span>
                          </p>
                          <p className="truncate text-sm">{f.value}</p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          aria-label={`Copy ${f.label}`}
                          onClick={() => copy(`${p.id}-${f.key}`, f.value, f.label)}
                        >
                          {copiedKey === `${p.id}-${f.key}` ? (
                            <Check className="h-3.5 w-3.5 text-green-400" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>

                  {p.status === 'used' && (
                    <p className="flex items-center gap-1 text-xs text-primary">
                      <CheckCircle2 className="h-3 w-3" aria-hidden />
                      Outcome: {p.outcome ?? '—'} {p.usedAt ? `· ${timeAgo(p.usedAt)}` : ''}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {p.status === 'ready' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => {
                          const outcome = window.prompt('Outcome? (e.g. Yes — we completed it!)')
                          if (outcome === null) return
                          patch(p.id, { status: 'used', outcome })
                        }}
                      >
                        <ClipboardList className="h-3.5 w-3.5" aria-hidden /> Mark used
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1"
                        onClick={() => patch(p.id, { status: 'ready' })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset to ready
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={p.pinned ? 'Unpin prediction' : 'Pin prediction'}
                      onClick={() => patch(p.id, { pinned: !p.pinned })}
                    >
                      {p.pinned ? (
                        <PinOff className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Pin className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${p.title}`}
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <span className="ml-auto text-xs text-muted-foreground">
                      updated {timeAgo(p.updatedAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit prediction</DialogTitle>
            <DialogDescription>Update the title, options or window.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Prediction title{' '}
                <span
                  className={cn(
                    'ml-1 text-xs tabular-nums',
                    editTitle.length > TWITCH_TITLE_MAX ? 'text-red-400' : 'text-muted-foreground'
                  )}
                >
                  {editTitle.length}/{TWITCH_TITLE_MAX}
                </span>
              </Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-options">Options (one per line)</Label>
              <Textarea
                id="edit-options"
                value={editOptions}
                onChange={(e) => setEditOptions(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-duration">Prediction window</Label>
              <Input
                id="edit-duration"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session rules */}
      <Card className="bg-secondary/40">
        <CardContent className="p-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Prediction session rules:</span> each
          prediction is open for <span className="text-foreground">5 minutes</span>. New
          predictions every <span className="text-foreground">15 minutes</span>. Don&apos;t miss
          your chance to vote and see what happens.
        </CardContent>
      </Card>
    </div>
  )
}
