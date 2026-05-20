import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding FlySky database...')

  // Ranks
  const ranks = await Promise.all([
    prisma.rank.upsert({ where: { code: 'SP' }, update: {}, create: { name: 'Student Pilot', code: 'SP', minHours: 0, minFlights: 0, minPoints: 0, color: '#94a3b8', order: 1 } }),
    prisma.rank.upsert({ where: { code: 'PPL' }, update: {}, create: { name: 'Private Pilot', code: 'PPL', minHours: 10, minFlights: 5, minPoints: 500, color: '#38bdf8', order: 2 } }),
    prisma.rank.upsert({ where: { code: 'CPL' }, update: {}, create: { name: 'Commercial Pilot', code: 'CPL', minHours: 50, minFlights: 20, minPoints: 2000, color: '#818cf8', order: 3 } }),
    prisma.rank.upsert({ where: { code: 'FO' }, update: {}, create: { name: 'First Officer', code: 'FO', minHours: 100, minFlights: 50, minPoints: 5000, color: '#34d399', order: 4 } }),
    prisma.rank.upsert({ where: { code: 'SR-FO' }, update: {}, create: { name: 'Senior First Officer', code: 'SR-FO', minHours: 250, minFlights: 100, minPoints: 12000, color: '#a78bfa', order: 5 } }),
    prisma.rank.upsert({ where: { code: 'CAP' }, update: {}, create: { name: 'Captain', code: 'CAP', minHours: 500, minFlights: 200, minPoints: 25000, color: '#f59e0b', order: 6 } }),
    prisma.rank.upsert({ where: { code: 'SR-CAP' }, update: {}, create: { name: 'Senior Captain', code: 'SR-CAP', minHours: 1000, minFlights: 500, minPoints: 60000, color: '#f97316', order: 7 } }),
  ])
  console.log(`✅ ${ranks.length} ranks created`)

  // Badges
  const badges = await Promise.all([
    prisma.badge.upsert({ where: { id: 'badge-first-flight' }, update: {}, create: { id: 'badge-first-flight', name: 'First Flight', description: 'Complete your first flight with FlySky', color: '#0ea5e9', category: 'achievement' } }),
    prisma.badge.upsert({ where: { id: 'badge-smooth-ops' }, update: {}, create: { id: 'badge-smooth-ops', name: 'Smooth Operator', description: 'Land with a rate better than -100 fpm', color: '#10b981', category: 'achievement' } }),
    prisma.badge.upsert({ where: { id: 'badge-100-flights' }, update: {}, create: { id: 'badge-100-flights', name: 'Century Club', description: 'Complete 100 flights', color: '#f59e0b', category: 'achievement' } }),
    prisma.badge.upsert({ where: { id: 'badge-transatlantic' }, update: {}, create: { id: 'badge-transatlantic', name: 'Transatlantic', description: 'Complete a transatlantic route', color: '#8b5cf6', category: 'route' } }),
  ])
  console.log(`✅ ${badges.length} badges created`)

  // FlySky Airline
  const flySkyAirline = await prisma.airline.upsert({
    where: { callsignPrefix: 'FSK' },
    update: {},
    create: {
      name: 'FlySky Virtual Airlines',
      callsignPrefix: 'FSK',
      icaoCode: 'FSK',
      hub: 'EGLL',
      description: 'The flagship virtual airline of the FlySky network. Operating worldwide from London Heathrow.',
    },
  })
  console.log('✅ FlySky airline created')

  console.log('ℹ️ No default routes seeded')

  // Sample aircraft
  const aircraft = [
    { registration: 'G-FSKA', type: 'Airbus A320-214', icaoCode: 'A320', hub: 'EGLL' },
    { registration: 'G-FSKB', type: 'Airbus A321-231', icaoCode: 'A321', hub: 'EGLL' },
    { registration: 'G-FSKC', type: 'Boeing 777-300ER', icaoCode: 'B77W', hub: 'EGLL' },
    { registration: 'G-FSKD', type: 'Boeing 737-800', icaoCode: 'B738', hub: 'KJFK' },
    { registration: 'G-FSKE', type: 'Airbus A350-941', icaoCode: 'A359', hub: 'OMDB' },
  ]

  for (const a of aircraft) {
    await prisma.aircraft.upsert({
      where: { registration: a.registration },
      update: a,
      create: a,
    })
  }
  console.log(`✅ ${aircraft.length} aircraft created`)

  // Admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@flysky.com'
  const adminExists = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (!adminExists) {
    const studentRank = ranks[0]
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'FlySky Admin',
        password: await bcrypt.hash('admin1234!', 12),
        role: 'ADMIN',
        pilot: {
          create: {
            callsign: 'FSK000',
            firstName: 'FlySky',
            lastName: 'Admin',
            hub: 'EGLL',
            rankId: studentRank.id,
          },
        },
      },
    })
    console.log(`✅ Admin user created: ${adminEmail} / admin1234!`)
    console.log('⚠️  Change the admin password immediately after first login!')
  }

  console.log('✅ Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
