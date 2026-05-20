import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getFlymeAuthCookieName, signFlymeAuth } from '@/lib/flyme-auth'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const data = schema.parse(payload)

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { pilot: true },
    })

    if (!user || !user.pilot) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(data.password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signFlymeAuth({
      userId: user.id,
      email: user.email,
      callsign: user.pilot.callsign,
    })

    const response = NextResponse.json({
      ok: true,
      callsign: user.pilot.callsign,
      userId: user.id,
      email: user.email,
    })

    response.cookies.set(getFlymeAuthCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }

    console.error('Flyme auth error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}