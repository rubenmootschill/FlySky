import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { z } from 'zod'

const updateAirlineSchema = z.object({
  name: z.string().min(1).optional(),
  hub: z.string().min(4).max(4).toUpperCase().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerLogoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional(),
  description: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'REJECTED']).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  
  // Check if this is an application action or airline update
  if (body.action && ['approve', 'reject'].includes(body.action)) {
    // Handle application approve/reject
    const { action, reviewNotes } = body
    
    const application = await prisma.airlineApplication.findUnique({ where: { id } })
    if (!application) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (action === 'approve') {
      await prisma.$transaction(async (tx) => {
        await tx.airlineApplication.update({
          where: { id },
          data: { status: 'ACTIVE', reviewNotes: reviewNotes ?? null, reviewedAt: new Date() },
        })
        // Create the actual Airline record and set ownerEmail
        await tx.airline.upsert({
          where: { callsignPrefix: application.callsignPrefix },
          update: {
            status: 'ACTIVE',
            ownerEmail: application.contactEmail,
            name: application.airlineName,
            icaoCode: application.icaoCode,
            website: application.website,
            hub: application.hub,
            description: application.description,
            logoUrl: application.logoUrl,
            bannerLogoUrl: application.bannerLogoUrl,
          },
          create: {
            name: application.airlineName,
            callsignPrefix: application.callsignPrefix,
            icaoCode: application.icaoCode,
            logoUrl: application.logoUrl,
            bannerLogoUrl: application.bannerLogoUrl,
            website: application.website,
            hub: application.hub,
            description: application.description,
            ownerEmail: application.contactEmail,
            status: 'ACTIVE',
          },
        })
        // Promote the user account to AIRLINE_OWNER if they have one
        await tx.user.updateMany({
          where: { email: application.contactEmail, role: 'PILOT' },
          data: { role: 'AIRLINE_OWNER' },
        })
      })
    } else {
      await prisma.airlineApplication.update({
        where: { id },
        data: { status: 'REJECTED', reviewNotes: reviewNotes ?? null, reviewedAt: new Date() },
      })
    }

    return NextResponse.json({ ok: true })
  } else {
    // Handle airline update
    try {
      const data = updateAirlineSchema.parse(body)
      const updateData = {
        ...data,
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
        ...(data.bannerLogoUrl !== undefined && { bannerLogoUrl: data.bannerLogoUrl || null }),
      }
      
      const airline = await prisma.airline.update({
        where: { id },
        data: updateData,
      })
      
      return NextResponse.json(airline)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to update airline' }, { status: 500 })
    }
  }
}

