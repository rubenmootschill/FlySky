import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyPilotSignup } from '@/lib/discord-notify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  hub: z.string().length(4).toUpperCase(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hash = await bcrypt.hash(data.password, 12)

    // Generate callsign (FSK001, FSK002, ...)
    const count = await prisma.pilot.count()
    const callsign = `FSK${String(count + 1).padStart(3, '0')}`

    // Find student pilot rank
    const studentRank = await prisma.rank.findFirst({ where: { minHours: 0 }, orderBy: { order: 'asc' } })

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        password: hash,
        pilot: {
          create: {
            callsign,
            firstName: data.firstName,
            lastName: data.lastName,
            hub: data.hub,
            rankId: studentRank?.id ?? null,
          },
        },
      },
    })

    await notifyPilotSignup({
      callsign,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hub: data.hub,
    })

    return NextResponse.json({ id: user.id, callsign }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
