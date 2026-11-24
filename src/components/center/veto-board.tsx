'use client'

import { useState } from 'react'
import { Veto } from '@/lib/types'
import { useData, timeAgo, copyText } from '@/hooks/use-data'
import { cn } from '@/lib/utils'
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
import { Plus, Minus, ShieldBan, UserPlus, Trash2, Pencil } from 'lucide-react'

// Veto Power - veto rights only. VIPs live on their own board (src/components/center/vip-board.tsx)
export default function VetoBoard() {
  const { data: vetoes, loading, refetch } = useData<Veto[]>('/api/vetoes', 10000)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // edit-note dialog
  const [editNoteId, setEditNoteId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const editTarget = (vetoes ?? []).find((v) => v.id === editNoteId)

  // delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const deleteTarget = (vetoes ?? []).find((v) => v.id === deleteConfirmId)

  async function addViewer() {
    if (!username.trim()) {
      toast({ title: 'Username is required', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/vetoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, note }),
      })
      if (!res.ok) throw new Error('Failed')
      setUsername('')
      setNote('')
      setOpen(false)
      toast({ title: 'Viewer added to veto board' })
      refetch()
    } catch {
      toast({ title: 'Could not add viewer', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/vetoes/${id}`, {
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
      const res = await fetch(`/api/vetoes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Viewer removed' })
      refetch()
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' })
    }
  }

  const totalRights = (vetoes ?? []).reduce((sum, v) => sum + v.vetoRights, 0)

  // Strongest first, then alphabetical - the top card is always the most
  // powerful veto holder right now.
  const sortedVetoes = [...(vetoes ?? [])].sort(
    (a, b) => b.vetoRights - a.vetoRights || a.username.localeCompare(b.username)
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Veto Power</h2>
          <p className="text-sm text-muted-foreground">
            Veto rights only - VIP status is tracked on its own board. Each viewer has a separate
            card.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" aria-hidden /> Add Viewer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add viewer to veto board</DialogTitle>
              <DialogDescription>Track their active veto rights.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="veto-user">Username</Label>
                <Input
                  id="veto-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addViewer()
                    }
                  }}
                  placeholder="e.g. Chadboy_hz"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="veto-note">Note (optional)</Label>
                <Input
                  id="veto-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. 0 active veto rights"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={addViewer} disabled={submitting}>
                {submitting ? 'Adding…' : 'Add to Board'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldBan className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <p className="text-xl font-bold tabular-nums">{vetoes?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">On the board</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldBan className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <p className="text-xl font-bold tabular-nums">{totalRights}</p>
              <p className="text-xs text-muted-foreground">Active veto rights</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading && vetoes === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : (vetoes ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ShieldBan className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">
              The veto board is empty - add the first viewer with veto rights.
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" aria-hidden /> Add Viewer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedVetoes.map((v) => (
            <Card key={v.id}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-lg font-semibold">
                    {v.username.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <button
                      type="button"
                      title={`Copy ${v.username}`}
                      aria-label={`Copy username ${v.username}`}
                      onClick={async () => {
                        const ok = await copyText(v.username)
                        if (ok) toast({ title: `Copied ${v.username}` })
                      }}
                      className="flex items-center gap-2 rounded font-semibold transition-colors hover:text-primary"
                    >
                      {v.username}
                      {v.vetoRights === 0 && (
                        <Badge
                          variant="outline"
                          className="border-border bg-muted text-[10px] text-muted-foreground"
                        >
                          No active rights
                        </Badge>
                      )}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      updated {timeAgo(v.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
                  <div>
                    <p className="text-lg font-bold tabular-nums">{v.vetoRights}</p>
                    <div className="mt-1 flex gap-1" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'h-1.5 w-4 rounded-full',
                            i < Math.min(v.vetoRights, 5) ? 'bg-primary' : 'bg-muted'
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      active veto right{v.vetoRights === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label={`Decrease veto rights for ${v.username}`}
                      disabled={v.vetoRights === 0}
                      onClick={() => patch(v.id, { vetoRights: v.vetoRights - 1 })}
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label={`Increase veto rights for ${v.username}`}
                      onClick={() => patch(v.id, { vetoRights: v.vetoRights + 1 })}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>

                {v.note && <p className="text-sm text-muted-foreground">{v.note}</p>}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Edit note for ${v.username}`}
                    title="Edit note"
                    onClick={() => {
                      setEditNoteId(v.id)
                      setEditNote(v.note ?? '')
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${v.username} from board`}
                    onClick={() => setDeleteConfirmId(v.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this viewer?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? deleteTarget.username : 'Viewer'} will be taken off the veto
              board, along with their rights count. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Keep them
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) remove(deleteConfirmId)
                setDeleteConfirmId(null)
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit-note dialog */}
      <Dialog open={editNoteId !== null} onOpenChange={(o) => !o && setEditNoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
            <DialogDescription>
              {editTarget ? editTarget.username : 'Viewer'} - update the note shown on their
              card.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="veto-edit-note">Note</Label>
            <Input
              id="veto-edit-note"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editNoteId) {
                  patch(editNoteId, { note: editNote })
                  setEditNoteId(null)
                  toast({ title: 'Note updated' })
                }
              }}
              placeholder="e.g. 0 active veto rights"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNoteId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editNoteId) patch(editNoteId, { note: editNote })
                setEditNoteId(null)
                toast({ title: 'Note updated' })
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-secondary/40">
        <CardContent className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          Every veto change (+1, -1, add, remove) is written to the Activity Log automatically.
          VIP grants &amp; the monthly VIP event live on the{' '}
          <span className="font-medium text-foreground">VIP Board</span>.
        </CardContent>
      </Card>
    </div>
  )
}
