'use client'

import { useMemo, useState } from 'react'
import { commandGroups } from '@/lib/commands-data'
import { copyText } from '@/hooks/use-data'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Terminal, Search, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const platformBadge: Record<string, { label: string; className: string }> = {
  twitch: { label: 'Twitch', className: 'bg-primary/15 text-primary border-primary/40' },
  nightbot: { label: 'Nightbot', className: 'bg-green-500/15 text-green-400 border-green-500/40' },
  custom: { label: 'Custom', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
}

export default function CommandsReference() {
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState<'all' | 'twitch' | 'nightbot' | 'custom'>('all')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return commandGroups
      .filter((g) => platform === 'all' || g.platform === platform)
      .map((g) => ({
        ...g,
        commands: g.commands.filter(
          (c) => !q || c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.commands.length > 0)
  }, [query, platform])

  const totalShown = filtered.reduce((n, g) => n + g.commands.length, 0)

  async function handleCopy(cmd: string) {
    const ok = await copyText(cmd)
    if (ok) {
      setCopied(cmd)
      toast({ title: 'Copied to clipboard', description: cmd.slice(0, 60) })
      setTimeout(() => setCopied(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Command Reference</h2>
        <p className="text-sm text-muted-foreground">
          Every Twitch, Nightbot and custom command from the doc - searchable, one-tap copy.
        </p>
      </div>

      {/* Search + filters */}
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
          {(['all', 'twitch', 'nightbot', 'custom'] as const).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={platform === p ? 'default' : 'outline'}
              className={cn('h-8 capitalize', platform === p && 'text-primary-foreground')}
              onClick={() => setPlatform(p)}
            >
              {p === 'all' ? 'All' : platformBadge[p].label}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {totalShown} command{totalShown === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Groups */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No commands match “{query}”. Try another search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((g) => {
            const badge = platformBadge[g.platform]
            return (
              <Card key={g.id} className="flex flex-col">
                <CardContent className="flex-1 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">
                        {g.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">{g.subtitle}</p>
                    </div>
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  </div>
                  <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
                    {g.commands.map((c, i) => (
                      <li
                        key={`${c.cmd}-${i}`}
                        className="group flex items-center justify-between gap-2 rounded-md border border-border/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-primary/40"
                      >
                        <div className="min-w-0">
                          <code className="block truncate font-mono text-xs font-semibold text-primary">
                            {c.cmd}
                          </code>
                          <span className="block text-xs text-muted-foreground">{c.desc}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                          aria-label={`Copy ${c.cmd}`}
                          onClick={() => handleCopy(c.cmd)}
                        >
                          {copied === c.cmd ? (
                            <Check className="h-3.5 w-3.5 text-green-400" aria-hidden />
                          ) : (
                            <Copy className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </Button>
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
          Tip: search “!title” to grab all the channel title presets for Main Channel &amp;
          Timepass Time, then paste straight into Twitch chat.
        </CardContent>
      </Card>
    </div>
  )
}
