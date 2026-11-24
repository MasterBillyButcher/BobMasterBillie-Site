import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Database health check.
// Open /api/health on the deployed site to verify that the Supabase
// connection works and every table exists and is reachable.
export async function GET() {
  try {
    const [
      movies,
      predictions,
      vetoes,
      vipMembers,
      vipEvents,
      backlogEvents,
      activityLogs,
      announcements,
    ] = await Promise.all([
      db.movie.count(),
      db.prediction.count(),
      db.veto.count(),
      db.vipMember.count(),
      db.vipEvent.count(),
      db.backlogEvent.count(),
      db.activityLog.count(),
      db.announcement.count(),
    ])
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      counts: {
        movies,
        predictions,
        vetoes,
        vipMembers,
        vipEvents,
        backlogEvents,
        activityLogs,
        announcements,
      },
      time: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        hint: 'Check DATABASE_URL in Vercel and that supabase/init.sql was run in the Supabase SQL Editor.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
