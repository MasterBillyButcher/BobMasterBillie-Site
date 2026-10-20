// Shared activity logger - every mutation gets logged automatically
import { db } from '@/lib/db'

export async function logActivity(entry: {
  type:
    | 'movie'
    | 'prediction'
    | 'veto'
    | 'vip'
    | 'backlog'
    | 'announcement'
    | 'stream'
    | 'custom'
  action: 'created' | 'updated' | 'deleted' | 'note' | 'scheduled'
  title: string
  details?: string
  pinned?: boolean
}) {
  try {
    return await db.activityLog.create({
      data: {
        type: entry.type,
        action: entry.action,
        title: entry.title,
        details: entry.details ?? null,
        pinned: entry.pinned ?? false,
      },
    })
  } catch (e) {
    console.error('Failed to write activity log', e)
    return null
  }
}
