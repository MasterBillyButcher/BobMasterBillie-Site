'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Command } from '@/lib/types'
import { useData, copyText, stampTime } from '@/hooks/use-data'
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
import ErrorState from '@/components/center/error-state'
import { cn } from '@/lib/utils'
import { Terminal, Search, Copy, Check, Plus, Pencil, Trash2, X, ChevronDown } from 'lucide-react'

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

// Short filter labels - sections collapse into All / Twitch / Nightbot / Custom
// (any new section you create gets its first word as the chip label)
function chipFor(group: string): { key: string; label: string } {
  if (group.startsWith('Twitch')) return { key: 'twitch', label: 'Twitch' }
  if (group.startsWith('Nightbot')) return { key: 'nightbot', label: 'Nightbot' }
  if (group.startsWith('Custom')) return { key: 'custom', label: 'Custom' }
  const word = group.split(' ')[0] || group
  return { key: word.toLowerCase(), label: word }
}

export default function CommandsReference() {
  const { data: commands, loading, error, refetch, fetchedAt } = useData<Command[]>('/api/commands', 15000)
  const unlocked = useAdminUnlocked()
  const { toast } = useToast()

  const [query, setQuery] = useState('')
  const [activeGroup, setActiveGroup] = useState<'all' | string>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Folded sections - remembered per session, all expanded by default.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleCollapsed(groupName: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(groupName)) next.delete(groupName)
      else next.add(groupName)
      return next
    })
  }

  // Jump row: show every section, scroll to the card, expand it if folded.
  function jumpToGroup(groupName: string) {
    setActiveGroup('all')
    setCollapsed((prev) => {
      if (!prev.has(groupName)) return prev
      const next = new Set(prev)
      next.delete(groupName)
      return next
    })
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-group-name="${CSS.escape(groupName)}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Press "/" anywhere on the tab to jump into the search box
  // (ignored while typing in another field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (
        t &&
        (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
      ) {
        return
      }
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // create / edit dialog
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [cmd, setCmd] = useState('')
  const [description, setDescription] = useState('')
  const [group, setGroup] = useState('Custom Commands')
  const [submitting, setSubmitting] = useState(false)

  const all = commands ?? []

  // unique filter chips in the order they appear (seed order preserved),
  // each with a live count of the commands it will reveal
  const chips = useMemo(() => {
    const seen: Array<{ key: string; label: string; count: number }> = []
    for (const c of all) {
      const chip = chipFor(c.group)
      const found = seen.find((s) => s.key === chip.key)
      if (found) found.count += 1
      else seen.push({ key: chip.key, label: chip.label, count: 1 })
    }
    return seen
  }, [all])

  // full section names for the "New Command" dropdown suggestions
  const groupNames = useMemo(() => {
    const seen: string[] = []
    for (const c of all) if (!seen.includes(c.group)) seen.push(c.group)
    return seen
  }, [all])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (c) =>
        (activeGroup === 'all' || chipFor(c.group).key === activeGroup) &&
        (!q ||
          c.cmd.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.group.toLowerCase().includes(q))
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

  // Whole section in one paste - every command, one per line.
  async function handleCopyGroup(groupName: string, list: Command[]) {
    const ok = await copyText(list.map((c) => c.cmd).join('\n'))
    if (ok) {
      toast({
        title: `${list.length} command${list.length === 1 ? '' : 's'} copied`,
        description: groupName,
      })
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  function openNew() {
    setEditId(null)
    setCmd('')
    setDescription('')
    const match = all.find((c) => chipFor(c.group).key === activeGroup)
    setGroup(activeGroup === 'all' || !match ? 'Custom Commands' : match.group)
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
            {all.length > 0 &&
              ` ${all.length} commands across ${groupNames.length} section${groupNames.length === 1 ? '' : 's'}.`}
            {stampTime(fetchedAt) && ` Updated ${stampTime(fetchedAt)}.`}
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
                  {groupNames.map((g) => (
                    <option key={g} value={g} />
                  ))}
                </datalist>
                {group.trim() && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    Will show under:
                    <Badge variant="outline" className={groupBadge(group).className}>
                      {groupBadge(group).label}
                    </Badge>
                  </p>
                )}
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
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands… (e.g. timeout, title, songs)"
            className="pl-9 pr-10"
            aria-label="Search commands"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : (
            <kbd
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              aria-hidden
            >
              /
            </kbd>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={activeGroup === 'all' ? 'default' : 'outline'}
            className={cn('h-8', activeGroup === 'all' && 'text-primary-foreground')}
            onClick={() => setActiveGroup('all')}
          >
            All
            <span className={cn('ml-1 text-xs tabular-nums', activeGroup === 'all' ? 'opacity-80' : 'text-muted-foreground')}>
              {all.length}
            </span>
          </Button>
          {chips.map((chip) => (
            <Button
              key={chip.key}
              size="sm"
              variant={activeGroup === chip.key ? 'default' : 'outline'}
              className={cn('h-8', activeGroup === chip.key && 'text-primary-foreground')}
              onClick={() => setActiveGroup(chip.key)}
            >
              {chip.label}
              <span className={cn('ml-1 text-xs tabular-nums', activeGroup === chip.key ? 'opacity-80' : 'text-muted-foreground')}>
                {chip.count}
              </span>
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} command{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Section jump row - one tap scrolls straight to a section card */}
      {query.trim() === '' && groupNames.length > 3 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Jump to a section">
          {groupNames.map((g) => (
            <button
              key={g}
              onClick={() => jumpToGroup(g)}
              title={`Jump to ${g}`}
              className="max-w-[220px] truncate rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Groups */}
      {error && !commands ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : loading && commands === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Terminal className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              {all.length === 0
                ? unlocked
                  ? 'No commands yet - add your first one.'
                  : 'No commands yet.'
                : query
                  ? `No commands match "${query}". Try another search.`
                  : 'Nothing in this section.'}
            </p>
            {unlocked && all.length === 0 && (
              <Button size="sm" className="gap-1.5" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> New Command
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {grouped.map(([groupName, list]) => {
            const badge = groupBadge(groupName)
            return (
              <Card key={groupName} data-group-name={groupName} className="flex flex-col scroll-mt-24">
                <CardContent className="flex-1 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{groupName}</h3>
                      <p className="text-xs text-muted-foreground">
                        {list.length} command{list.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-label={`Copy all ${list.length} ${groupName} commands`}
                        title={`Copy all ${list.length} commands`}
                        onClick={() => handleCopyGroup(groupName, list)}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Badge variant="outline" className={badge.className}>
                        {badge.label}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        aria-expanded={!collapsed.has(groupName)}
                        aria-label={
                          collapsed.has(groupName)
                            ? `Expand ${groupName}`
                            : `Collapse ${groupName}`
                        }
                        onClick={() => toggleCollapsed(groupName)}
                      >
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 transition-transform',
                            collapsed.has(groupName) && '-rotate-90'
                          )}
                          aria-hidden
                        />
                      </Button>
                    </div>
                  </div>
                  {!collapsed.has(groupName) && (
                    <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <code
                            className="block truncate font-mono text-xs font-semibold text-primary"
                            title={c.cmd}
                          >
                            {c.cmd}
                          </code>
                          <span className="block truncate text-xs text-muted-foreground" title={c.description}>
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
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card className="bg-secondary/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          <Terminal className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Tip: search "!title" to grab all the channel title presets for Main Channel
          &amp; Timepass Time, then paste straight into Twitch chat.
        </CardContent>
      </Card>
    </div>
  )
}
