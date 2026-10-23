'use client'

import { useMemo, useState } from 'react'
import type { Command } from '@/lib/types'
import { useData, copyText } from '@/hooks/use-data'
import { useAdminUnlocked } from '@/components/center/admin-gate'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Terminal, Search, Copy, Check, Plus, Pencil, Trash2 } from 'lucide-react'

// Badge style based on which platform the group belongs to
function groupBadge(group: string): { label: string; className: string } {
  if (group.startsWith('Twitch')) {
    return { label: 'Twitch', className: 'bg-primary/15 text-primary border-primary/40' }
  }
  if (group.startsWith('Nightbot')) {
    return { label: 'Nightbot', className: 'bg-green-500/15 text-green-400 border-green-500/40' }
  }
  if (group.startsWith('Custom')) {
    return { label: 'Custom', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' }
  }
  return { label: 'Commands', className: 'bg-muted text-muted-foreground border-border' }
}

export default function CommandsReference() {
  const { data: commands, loading, refetch } = useData<Command[]>('/api/commands', 15000)
  const unlocked = useAdminUnlocked()
  const { toast } = useToast()

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<'all' | string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // create / edit dialog
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [cmd, setCmd] = useState('')
  const [description, setDescription] = useState('')
  const [group, setGroup] = useState('Custom Commands')
  const [submitting, setSubmitting] = useState(false)

  const all = commands ?? []

  // unique groups in the order they appear (seed order preserved)
  const groups = useMemo(() => {
    const seen: string[] = []
    for (const c of all) if (!seen.includes(c.group)) seen.push(c.group)
    return seen
  }, [all])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (c) =>
        (activeGroup === 'all' || c.group === activeGroup) &&
        (!q || c.cmd.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
    )
  }, [all, query, activeGroup])

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const c of filtered) {
      const list = map.get(c.group) ?? []
      list.push(c)
      map.set(c.group, list)
    }
    return [...map.entries()]
  }, [filtered])

  async function handleCopy(c: Command) {
    const ok = await copyText(c.cmd)
    if (ok) {
      setCopiedId(c.id)
      toast({ title: 'Command copied', description: c.cmd.slice(0, 60) })
      setTimeout(() => setCopiedId(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  function openNew() {
    setEditId(null)
    setCmd('')
    setDescription('')
    setGroup(activeGroup === 'all' ? 'Custom Commands' : activeGroup)
    setOpen(true)
  }

  function openEdit(c: Command) {
    setEditId(c.id)
    setCmd(c.cmd)
    setDescription(c.description)
    setGroup(c.group)
    setOpen(true)
  }

  async function submit() {
    if (!cmd.trim()) {
      toast({ title: 'Command text is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = editId
        ? await fetch(`/api/commands/${editId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd, description, group }),
          })
        : await fetch('/api/commands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cmd, description, group }),
          })
      if (!res.ok) throw new Error('Failed')
      setOpen(false)
      setCmd('')
      setDescription('')
      setEditId(null)
      toast({ title: editId ? 'Command updated' : 'Command added' })
      refetch()
    } catch {
      toast({ title: editId ? 'Could not update' : 'Could not add command', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string) {
    try {
      const res = await fetch(`/api/commands/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Command removed' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Commands</h2>
          <p className="text-sm text-muted-foreground">
            Every Twitch, Nightbot and custom command - searchable, one-tap copy.
          </p>
        </div>
        {unlocked && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openNew}>
                <Plus className="h-4 w-4" aria-hidden /> New Command
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Edit command' : 'New command'}</DialogTitle>
                <DialogDescription>
                  Pick an existing section or type a new one - the command shows up there.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="cmd-group">Section</Label>
                <Input
                  id="cmd-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  list="command-groups"
                  placeholder="e.g. Custom Commands"
                />
                <datalist id="command-groups">
                  {groups.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cmd-text">Command</Label>
                <Input
                  id="cmd-text"
                  value={cmd}
                  onChange={(e) => setCmd(e.target.value)}
                  placeholder="e.g. !discord"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cmd-desc">What it does</Label>
                <Input
                  id="cmd-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Shows the Discord invite link"
                />
              </div>
              <DialogFooter>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? 'Saving…' : editId ? 'Save changes' : 'Add command'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search + section filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands… (e.g. timeout, title, songs)"
            className="pl-9"
            aria-label="Search commands"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={activeGroup === 'all' ? 'default' : 'outline'}
            className={cn('h-8', activeGroup === 'all' && 'text-primary-foreground')}
            onClick={() => setActiveGroup('all')}
          >
            All
          </Button>
          {groups.map((g) => (
            <Button
              key={g}
              size="sm"
              variant={activeGroup === g ? 'default' : 'outline'}
              className={cn(
                'h-8 max-w-56 truncate',
                activeGroup === g && 'text-primary-foreground'
              )}
              onClick={() => setActiveGroup(g)}
            >
              {g}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} command{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Groups */}
      {loading && commands === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {all.length === 0
              ? unlocked
                ? 'No commands yet - add your first one.'
                : 'No commands yet.'
              : query
                ? `No commands match "${query}". Try another search.`
                : 'Nothing in this section.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.map(([groupName, list]) => {
            const badge = groupBadge(groupName)
            return (
              <Card key={groupName} className="flex flex-col">
                <CardContent className="flex-1 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{groupName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {list.length} command{list.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  </div>
                  <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <code className="block truncate font-mono text-xs font-semibold text-primary">
                            {c.cmd}
                          </code>
                          <span className="block text-xs text-muted-foreground">
                            {c.description}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          {unlocked && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 opacity-60 transition-opacity group-hover:opacity-100"
                                aria-label={`Edit ${c.cmd}`}
                                onClick={() => openEdit(c)}
                              >
                                <Pencil className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100"
                                aria-label={`Remove ${c.cmd}`}
                                onClick={() => remove(c.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 opacity-60 transition-opacity group-hover:opacity-100"
                            aria-label={`Copy ${c.cmd}`}
                            onClick={() => handleCopy(c)}
                          >
                            {copiedId === c.id ? (
                              <Check className="h-3.5 w-3.5 text-green-400" aria-hidden />
                            ) : (
                              <Copy className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-secondary/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Tip: search &ldquo;!title&rdquo; to grab all the channel title presets for Main Channel
          &amp; Timepass Time, then paste straight into Twitch chat.
        </CardContent>
      </Card>
    </div>
  )
}
