import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifySupportReportSubmitted } from '@/lib/discord-notify'

const createSupportReportSchema = z.object({
  subject: z.string().trim().min(5).max(140),
  message: z.string().trim().min(10).max(5000),
  category: z.enum(['ISSUE', 'QUESTION', 'REPORT', 'OTHER']).default('OTHER'),
  email: z.string().email().optional(),
  airlineId: z.string().cuid().optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = createSupportReportSchema.parse(body)
    const session = await getSession()

    const report = await prisma.supportReport.create({
      data: {
        subject: data.subject,
        message: data.message,
        category: data.category,
        email: data.email ?? session?.user.email ?? null,
        userId: session?.user.id ?? null,
        airlineId: data.airlineId ?? null,
      },
      include: {
        airline: { select: { name: true } },
      },
    })

    await notifySupportReportSubmitted({
      reportId: report.id,
      category: report.category,
      subject: report.subject,
      email: report.email,
      airlineName: report.airline?.name ?? null,
      airlineId: report.airlineId,
    })

    return NextResponse.json({ id: report.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    console.error('Support report create error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
