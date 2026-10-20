'use client'

import { useState } from 'react'
import { cvTemplates } from '@/lib/commands-data'
import { copyText } from '@/hooks/use-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Copy, Check, FileText, MessageSquare } from 'lucide-react'

export default function CvTemplates() {
  const { toast } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function handleCopy(id: string, body: string) {
    const ok = await copyText(body)
    if (ok) {
      setCopiedId(id)
      toast({ title: 'Template copied', description: 'Paste it into Discord or Twitch DMs.' })
      setTimeout(() => setCopiedId(null), 1600)
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">CV &amp; Outreach Templates</h2>
        <p className="text-sm text-muted-foreground">
          Ready-to-send moderation applications — replace [Server Name] / [Streamer Name] and
          send.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cvTemplates.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" aria-hidden /> {t.title}
              </CardTitle>
              <Badge variant="outline" className="border-border text-muted-foreground">
                Template
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <pre className="max-h-96 flex-1 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-secondary/30 p-4 font-mono text-xs leading-relaxed">
                {t.body}
              </pre>
              <Button
                onClick={() => handleCopy(t.id, t.body)}
                className="w-full gap-2"
                variant={copiedId === t.id ? 'outline' : 'default'}
              >
                {copiedId === t.id ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" aria-hidden /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden /> Copy template
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-secondary/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Pro tip: keep both templates pinned — one for Discord servers, one for Twitch/YouTube
          streamers. Personalize the first line before sending for best reply rates.
        </CardContent>
      </Card>
    </div>
  )
}
