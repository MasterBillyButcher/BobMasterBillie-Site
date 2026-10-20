// Reset the BobMasterBillie Command Center database, then add ONLY the real
// community data: the two veto contenders (Lolwazi, Chadboy_hz) and the VIP
// board entry (mickey_17__, one more chance to earn VIP back).
//
// NOTHING else is seeded: no movies, no predictions, no announcements and
// especially no setup activity logs. The Activity Log stays empty until you
// make real changes in the app.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('Resetting database and adding the veto contenders + VIP board entry...')

  // 1. Clear everything (including any old setup logs)
  await db.activityLog.deleteMany()
  await db.backlogEvent.deleteMany()
  await db.vipEvent.deleteMany()
  await db.vipMember.deleteMany()
  await db.announcement.deleteMany()
  await db.veto.deleteMany()
  await db.prediction.deleteMany()
  await db.movie.deleteMany()

  // 2. Veto Power contenders
  await db.veto.createMany({
    data: [
      { username: 'Lolwazi', vetoRights: 0, note: 'Veto contender - 0 active veto rights' },
      { username: 'Chadboy_hz', vetoRights: 0, note: 'Veto contender - 0 active veto rights' },
    ],
  })

  // 3. VIP board - mickey_17__ on his last chance (probation)
  await db.vipMember.create({
    data: {
      username: 'mickey_17__',
      status: 'probation',
      note: 'Gets one more chance to earn VIP back.',
    },
  })

  console.log('Done. Veto: Lolwazi + Chadboy_hz. VIP: mickey_17__ (one more chance).')
  console.log('No movies, no predictions, no setup logs - add those in the app.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
