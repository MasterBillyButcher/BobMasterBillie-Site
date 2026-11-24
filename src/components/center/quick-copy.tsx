'use client'

// Quick Copy - the instant-copy palette.
// Opens from any tab with Ctrl K (Cmd K on Mac), the header chip or the
// floating button. Search across every command, prediction setup and
// announcement, press Enter, and the text lands on the clipboard.
// Nothing here writes to the database - copying is a read-only action.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Zap, Search, Clock, Check } from 'lucide-react'
import { copyText } from '@/hooks/use-data'
import { useToast } from '@/hooks/use-toast'
import { predictionSetupText, optionLines } from '@/lib/prediction-format'
import type { Command, Prediction, Announcement } from '@/lib/types'
import { cn } from '@/lib/utils'

type CopyItem = {
  id: string
  display: string
  text: string
  label: string
  badge: string
  badgeClass: string
  mono: boolean
  haystack: string
}

type Recent = Omit<CopyItem, 'haystack'>

type Section = { title: string; items: CopyItem[] }

type Row = { kind: 'header'; title: string } | { kind: 'item'; item: CopyItem }

const RECENTS_KEY = 'bmb-quick-copy-recents'
const MAX_RECENTS = 5
const COMMAND_RESULT_CAP = 30

const BADGE_TWITCH = 'border-primary/40 bg-primary/15 text-primary'
const BADGE_NIGHTBOT = 'border-green-500/40 bg-green-500/15 text-green-400'
const BADGE_CUSTOM = 'border-yellow-500/40 bg-yellow-500/15 text-yellow-400'
const BADGE_PREDICTION = 'border-sky-500/40 bg-sky-500/15 text-sky-400'
const BADGE_ANNOUNCEMENT = 'border-amber-500/40 bg-amber-500/15 text-amber-400'

// Same categories as the Predictions board, used as palette badges.
const PREDICTION_CATEGORY_LABELS: Record<string, string> = {
  hype: 'Hype Train',
  treasure: 'Treasure Train',
  satta: 'SATTA LIVE',
  babu: 'Babu Watch',
  custom: 'Twitch prediction',
}

// Highlights the part of the text that matched the search, so results read naturally.
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim().toLowerCase()
  if (!q) return <>{text}</>
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/30 px-0.5 text-foreground">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  )
}

function platformBadge(group: string): { badge: string; badgeClass: string } {
  if (group.startsWith('Twitch')) return { badge: 'Twitch', badgeClass: BADGE_TWITCH }
  if (group.startsWith('Nightbot')) return { badge: 'Nightbot', badgeClass: BADGE_NIGHTBOT }
  if (group.startsWith('Custom')) return { badge: 'Custom', badgeClass: BADGE_CUSTOM }
  return { badge: 'Command', badgeClass: 'border-border bg-muted text-muted-foreground' }
}

function itemFromCommand(c: Command): CopyItem {
  const b = platformBadge(c.group)
  return {
    id: c.id,
    display: c.cmd,
    text: c.cmd,
    label: c.description,
    badge: b.badge,
    badgeClass: b.badgeClass,
    mono: true,
    haystack: `${c.cmd} ${c.description} ${c.group}`.toLowerCase(),
  }
}

function itemFromPrediction(p: Prediction): CopyItem {
  const options = optionLines(p.options)
  const categoryLabel = PREDICTION_CATEGORY_LABELS[p.category] ?? 'Prediction'
  return {
    id: `pred-${p.id}`,
    display: p.title,
    text: predictionSetupText(p),
    label: `${options.length} option${options.length === 1 ? '' : 's'} - ${p.duration}`,
    badge: categoryLabel,
    badgeClass: BADGE_PREDICTION,
    mono: false,
    haystack: `${p.title} ${p.category} ${categoryLabel} prediction`.toLowerCase(),
  }
}

function itemFromAnnouncement(a: Announcement): CopyItem {
  return {
    id: `ann-${a.id}`,
    display: a.message,
    text: a.message,
    label: 'Announcement',
    badge: 'Announcement',
    badgeClass: BADGE_ANNOUNCEMENT,
    mono: false,
    haystack: `${a.message} announcement`.toLowerCase(),
  }
}

function loadRecents(): Recent[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

// Wipe the recents list (local only - nothing in the database).
function clearRecentsStorage() {
  try {
    window.localStorage.removeItem(RECENTS_KEY)
  } catch {
    // storage blocked - nothing to clean
  }
}

export default function QuickCopy() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [store, setStore] = useState<{
    commands: Command[]
    predictions: Prediction[]
    announcements: Announcement[]
  } | null>(null)
  const [recents, setRecents] = useState<CopyItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Ctrl K / Cmd K toggles the palette; the header chip dispatches a custom event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpenEvent = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('bmb:quick-copy', onOpenEvent)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('bmb:quick-copy', onOpenEvent)
    }
  }, [])

  // Load the copyable data the first time the palette opens.
  useEffect(() => {
    if (!open || store) return
    let cancelled = false
    Promise.all([
      fetch('/api/commands', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/predictions', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/announcements', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([commands, predictions, announcements]) => {
        if (cancelled) return
        setStore({ commands, predictions, announcements })
        setRecents(loadRecents().map((r) => ({ ...r, haystack: '' })))
      })
      .catch(() => {
        if (!cancelled) toast({ title: 'Could not load copy items', variant: 'destructive' })
      })
    return () => {
      cancelled = true
    }
  }, [open, store, toast])

  // Reset state, lock page scroll, focus the input while open.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelected(0)
    setCopiedId(null)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    return () => {
      document.body.style.overflow = ''
      clearTimeout(t)
    }
  }, [open])

  const sections = useMemo<Section[]>(() => {
    const q = query.trim().toLowerCase()
    const commands = store?.commands ?? []
    const predictions = (store?.predictions ?? []).filter((p) => p.status === 'ready')
    const announcements = (store?.announcements ?? []).filter((a) => a.active)

    if (!q) {
      const out: Section[] = []
      if (recents.length) out.push({ title: 'Recent copies', items: recents })
      if (predictions.length) out.push({ title: 'Prediction setups', items: predictions.map(itemFromPrediction) })
      if (announcements.length) out.push({ title: 'Announcements', items: announcements.map(itemFromAnnouncement) })
      const custom = commands.filter((c) => c.group.startsWith('Custom')).map(itemFromCommand)
      if (custom.length) out.push({ title: 'Your custom commands', items: custom })
      return out
    }

    const out: Section[] = []
    const matchedPreds = predictions.map(itemFromPrediction).filter((i) => i.haystack.includes(q))
    const matchedAnns = announcements.map(itemFromAnnouncement).filter((i) => i.haystack.includes(q))
    const matchedCmds = commands.map(itemFromCommand).filter((i) => i.haystack.includes(q))
    if (recents.length) {
      const recentHits = recents.filter((i) => i.haystack.includes(q))
      if (recentHits.length) out.push({ title: 'Recent copies', items: recentHits })
    }
    if (matchedPreds.length) out.push({ title: 'Prediction setups', items: matchedPreds })
    if (matchedAnns.length) out.push({ title: 'Announcements', items: matchedAnns })
    if (matchedCmds.length) out.push({ title: 'Commands', items: matchedCmds.slice(0, COMMAND_RESULT_CAP) })
    return out
  }, [store, query, recents])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const s of sections) {
      out.push({ kind: 'header', title: s.title })
      for (const item of s.items) out.push({ kind: 'item', item })
    }
    return out
  }, [sections])

  const itemIndices = useMemo(() => {
    const idx: number[] = []
    rows.forEach((r, i) => {
      if (r.kind === 'item') idx.push(i)
    })
    return idx
  }, [rows])

  const truncatedCommands = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !store) return 0
    return store.commands.filter((c) => itemFromCommand(c).haystack.includes(q)).length - COMMAND_RESULT_CAP
  }, [store, query])

  const openPalette = useCallback(() => setOpen(true), [])

  async function copyItem(item: CopyItem) {
    const ok = await copyText(item.text)
    if (!ok) {
      toast({ title: 'Copy failed', variant: 'destructive' })
      return
    }
    const next = [{ ...item, haystack: undefined }, ...recents.filter((r) => r.text !== item.text)]
      .slice(0, MAX_RECENTS)
      .map(({ id, display, text, label, badge, badgeClass, mono }) => ({ id, display, text, label, badge, badgeClass, mono }))
    try {
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch {
      // storage full or blocked - recents are a nice-to-have, not critical
    }
    setCopiedId(item.id)
    toast({ title: 'Copied to clipboard', description: item.label })
    setTimeout(() => setOpen(false), 300)
    setTimeout(() => setCopiedId(null), 1200)
  }

  // Arrow navigation and Enter to copy while the palette is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected((s) => Math.min(itemIndices.length - 1, s + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected((s) => Math.max(0, s - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const rowIndex = itemIndices[selected]
        const row = rows[rowIndex]
        if (row && row.kind === 'item') copyItem(row.item)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemIndices, selected, rows])

  // Keep the selected row in view.
  useEffect(() => {
    const rowIndex = itemIndices[selected]
    if (rowIndex === undefined || !listRef.current) return
    const el = listRef.current.querySelectorAll('[data-row]')[rowIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected, itemIndices])

  if (!open) {
    return (
      <button
        onClick={openPalette}
        aria-label="Open quick copy - search and copy anything from any tab"
        className="fixed bottom-4 right-4 z-40 flex min-h-[48px] items-center gap-2 rounded-full bg-primary px-4 py-3 font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:bottom-5 sm:right-5"
      >
        <Zap className="h-5 w-5" aria-hidden />
        <span className="hidden text-sm sm:inline">Quick copy</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Quick copy">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={cn(
          'relative mx-auto mt-[9vh] w-[min(94vw,640px)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200'
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(0)
            }}
            placeholder="Search commands, predictions, announcements..."
            aria-label="Search copyable items"
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground sm:text-sm"
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {!store ? (
            <div className="space-y-2 px-4 py-3" aria-label="Loading copy items">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-secondary/60" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matches for "{query.trim()}". Try "!title", "timeout" or "hype".
            </p>
          ) : (
            rows.map((row, i) => {
              if (row.kind === 'header') {
                return (
                  <p
                    key={`h-${row.title}-${i}`}
                    className="flex items-center gap-1.5 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {row.title === 'Recent copies' && <Clock className="h-3 w-3" aria-hidden />}
                    {row.title}
                    {row.title === 'Recent copies' && (
                      <button
                        type="button"
                        onClick={() => {
                          clearRecentsStorage()
                          setRecents([])
                        }}
                        className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </p>
                )
              }
              const itemIndex = itemIndices.indexOf(i)
              const isSelected = itemIndex === selected
              const isCopied = copiedId === row.item.id
              return (
                <button
                  key={`${row.item.id}-${i}`}
                  data-row
                  onMouseEnter={() => setSelected(itemIndex)}
                  onClick={() => copyItem(row.item)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                    isSelected && 'bg-secondary'
                  )}
                >
                  <span
                    className={cn(
                      'shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium',
                      row.item.badgeClass
                    )}
                  >
                    {row.item.badge}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm',
                        row.item.mono ? 'font-mono font-medium text-primary' : 'text-foreground'
                      )}
                    >
                      <Highlight text={row.item.display} query={query} />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground"><Highlight text={row.item.label} query={query} /></span>
                  </span>
                  {isCopied && <Check className="h-4 w-4 shrink-0 text-green-400" aria-hidden />}
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">↑</kbd>
            <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-secondary px-1 py-0.5 font-mono">Enter</kbd>
            copy
          </span>
          <span>{store ? `${store.commands.length} commands ready` : 'Loading…'}</span>
          {truncatedCommands > 0 && <span>+{truncatedCommands} more - keep typing</span>}
        </div>
      </div>
    </div>
  )
}
