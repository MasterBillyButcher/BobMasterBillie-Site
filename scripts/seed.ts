// Seed the BobMasterBillie Command Center database
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function announce(title: string) {
  return `/announcepurple SATTA LIVE — ${title} — Make your predictions now!`
}

async function main() {
  console.log('Seeding BobMasterBillie Command Center...')

  await db.activityLog.deleteMany()
  await db.backlogEvent.deleteMany()
  await db.vipEvent.deleteMany()
  await db.vipMember.deleteMany()
  await db.announcement.deleteMany()
  await db.veto.deleteMany()
  await db.prediction.deleteMany()
  await db.movie.deleteMany()

  // Movies — planned (not backlog) + watched
  await db.movie.createMany({
    data: [
      {
        title: 'Manzil',
        status: 'planned',
        notes: 'Earned via bits goal (+1 backlog)',
        plannedDate: new Date('2026-10-21T20:00:00.000Z'),
      },
      { title: 'Rockstar', status: 'planned', notes: 'Earned via bits goal (+1 backlog)' },
      { title: 'Saiyaara', status: 'planned', notes: 'Earned via bits goal (+1 backlog)' },
      {
        title: 'The Notebook',
        status: 'watched',
        notes: 'Completed Oct 19 • -1 backlog +1 backlog (Bits Goal)',
        watchedDate: new Date('2026-10-19T20:00:00.000Z'),
      },
    ],
  })

  // Backlog ledger — +1 bits goal · -1 movie watched
  await db.backlogEvent.createMany({
    data: [
      {
        type: 'bits_goal',
        delta: 1,
        note: 'Bits goal completed — Manzil earned for the backlog',
        occurredAt: new Date('2026-10-12T21:30:00.000Z'),
      },
      {
        type: 'bits_goal',
        delta: 1,
        note: 'Bits goal completed — Rockstar earned for the backlog',
        occurredAt: new Date('2026-10-14T21:45:00.000Z'),
      },
      {
        type: 'bits_goal',
        delta: 1,
        note: 'Bits goal completed — Saiyaara earned for the backlog',
        occurredAt: new Date('2026-10-16T22:10:00.000Z'),
      },
      {
        type: 'bits_goal',
        delta: 1,
        note: 'Bits goal completed — The Notebook earned for the backlog',
        occurredAt: new Date('2026-10-17T21:20:00.000Z'),
      },
      {
        type: 'watched',
        delta: -1,
        note: 'Watched: The Notebook',
        occurredAt: new Date('2026-10-19T20:00:00.000Z'),
      },
    ],
  })

  // Predictions — copy-paste ready Twitch texts
  await db.prediction.createMany({
    data: [
      {
        title: 'Will We Complete Lvl 1 Hype Train?',
        options: JSON.stringify(['Yes', 'No']),
        announceText: '/announcepurple HYPE TRAIN INCOMING — Will We Complete Lvl 1? Make your predictions now!',
        duration: '10 minutes',
        category: 'hype',
        pinned: true,
      },
      {
        title: 'Will We Complete Lvl 1 Treasure Train?',
        options: JSON.stringify(['Yes', 'No']),
        announceText: '/announcepurple TREASURE TRAIN — Will We Complete Lvl 1? Predict now!',
        duration: '10 minutes',
        category: 'treasure',
      },
      {
        title: 'SATTA LIVE — Make your predictions now!',
        options: JSON.stringify(['Yes', 'No']),
        announceText: announce('Make your predictions now!'),
        duration: '5 minutes',
        category: 'satta',
      },
      {
        title: 'Will Babu arrive before 00:00?',
        options: JSON.stringify(['Before 00:00', 'After 00:00']),
        announceText: '/announcepurple Prediction Session — Will Babu arrive before 00:00? Vote now!',
        duration: '5 minutes',
        category: 'babu',
        pinned: true,
      },
    ],
  })

  // Veto Power — Chad & Lolwazi only
  await db.veto.createMany({
    data: [
      { username: 'Lolwazi', vetoRights: 0, note: '0 active veto rights' },
      { username: 'Chadboy_hz', vetoRights: 0, note: '0 active veto rights' },
    ],
  })

  // VIP Board — mickey_17__ separate (probation)
  await db.vipMember.create({
    data: {
      username: 'mickey_17__',
      status: 'probation',
      note: 'Gets one more chance to earn VIP back.',
    },
  })
  await db.vipEvent.create({
    data: {
      username: 'mickey_17__',
      eventType: 'probation',
      month: '2026-10',
      note: 'Moved to probation — one more chance to earn VIP back.',
    },
  })

  // Announcements
  await db.announcement.createMany({
    data: [
      {
        message:
          'Prediction Session rules — each prediction is open for 5 minutes. New predictions every 15 minutes. Don’t miss your chance to vote and see what happens!',
        active: true,
      },
      {
        message: 'No stream tonight, y’all. He’ll see everyone tomorrow night!',
        active: true,
      },
      {
        message: 'Stream chat will still happen at the usual time — wait for it.',
        active: true,
      },
    ],
  })

  // Activity Log (history from the doc)
  await db.activityLog.createMany({
    data: [
      {
        type: 'movie',
        action: 'updated',
        title: 'The Notebook completed — Oct 19',
        details: '-1 backlog +1 backlog (Bits Goal). Watched on Oct 19.',
        pinned: true,
      },
      {
        type: 'backlog',
        action: 'created',
        title: 'Backlog tracker live — count +3',
        details:
          '+4 bits goals completed · -1 movie watched (The Notebook) → backlog count +3. Movies to watch: Manzil, Rockstar, Saiyaara.',
        pinned: true,
      },
      {
        type: 'vip',
        action: 'updated',
        title: 'Monthly VIP Event — mickey_17__ on probation',
        details: 'mickey_17__ gets one more chance to earn VIP back.',
        pinned: true,
      },
      {
        type: 'veto',
        action: 'updated',
        title: 'Veto board updated',
        details: 'Lolwazi — 0 active veto rights. Chadboy_hz — 0 active veto rights.',
      },
      {
        type: 'prediction',
        action: 'created',
        title: 'Prediction session rules set',
        details: 'Each prediction open for 5 minutes. New predictions every 15 minutes.',
      },
      {
        type: 'stream',
        action: 'note',
        title: 'No stream tonight',
        details:
          'No stream tonight, y’all. Stream chat will still happen at the usual time. Back tomorrow night!',
      },
      {
        type: 'custom',
        action: 'note',
        title: 'Command center migrated from doc',
        details:
          'BobMasterBillie.docx migrated to the live Command Center — every log & update now lives here.',
        pinned: true,
      },
    ],
  })

  console.log('Seed complete')
  console.log({
    movies: await db.movie.count(),
    backlogEvents: await db.backlogEvent.count(),
    predictions: await db.prediction.count(),
    vetoes: await db.veto.count(),
    vipMembers: await db.vipMember.count(),
    vipEvents: await db.vipEvent.count(),
    logs: await db.activityLog.count(),
    announcements: await db.announcement.count(),
  })
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e)
    db.$disconnect()
    process.exit(1)
  })
