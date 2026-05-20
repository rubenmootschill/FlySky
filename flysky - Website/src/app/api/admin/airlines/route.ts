import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { saveAirlineLogo } from '@/lib/airline-logo-upload'
import { z } from 'zod'

const createAirlineSchema = z.object({
  name: z.string().min(1),
  callsignPrefix: z.string().min(2).max(5).toUpperCase(),
  icaoCode: z.string().min(2).max(4).toUpperCase().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerLogoUrl: z.string().url().optional().or(z.literal('')),
  hub: z.string().min(4).max(4).toUpperCase(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  ownerEmail: z.string().email().optional(),
});

export async function GET() {
  const session = await getSession()
  if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const applications = await prisma.airlineApplication.findMany({
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json(applications)
}

export async function POST(req: Request) {
  const session = await getSession()
  if (session?.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const contentType = req.headers.get('content-type') || ''
    let body: Record<string, unknown>
    let logoUrlFromFile: string | null = null
    let bannerLogoUrlFromFile: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const maybeLogo = formData.get('logoFile')
      const maybeBanner = formData.get('bannerLogoFile')
      const logoFile = maybeLogo instanceof File && maybeLogo.size > 0 ? maybeLogo : null
      const bannerLogoFile = maybeBanner instanceof File && maybeBanner.size > 0 ? maybeBanner : null

      if (logoFile) {
        try {
          logoUrlFromFile = await saveAirlineLogo(logoFile)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Logo upload failed.'
          return NextResponse.json({ error: message }, { status: 400 })
        }
      }

      if (bannerLogoFile) {
        try {
          bannerLogoUrlFromFile = await saveAirlineLogo(bannerLogoFile)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Banner logo upload failed.'
          return NextResponse.json({ error: message }, { status: 400 })
        }
      }

      body = {
        name: formData.get('name')?.toString() ?? '',
        callsignPrefix: formData.get('callsignPrefix')?.toString() ?? '',
        icaoCode: formData.get('icaoCode')?.toString() ?? '',
        logoUrl: '',
        bannerLogoUrl: '',
        hub: formData.get('hub')?.toString() ?? '',
        website: formData.get('website')?.toString() ?? '',
        description: formData.get('description')?.toString() ?? '',
        ownerEmail: formData.get('ownerEmail')?.toString() ?? '',
      }
    } else {
      body = await req.json()
    }

    const data = createAirlineSchema.parse(body)

    const airline = await prisma.airline.create({
      data: {
        name: data.name,
        callsignPrefix: data.callsignPrefix,
        icaoCode: data.icaoCode || null,
        logoUrl: logoUrlFromFile || data.logoUrl || null,
        bannerLogoUrl: bannerLogoUrlFromFile || data.bannerLogoUrl || null,
        hub: data.hub,
        website: data.website || null,
        description: data.description || null,
        ownerEmail: data.ownerEmail || null,
        status: 'ACTIVE',
      },
    })

    return NextResponse.json(airline)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating airline:', error)
    return NextResponse.json({ error: 'Failed to create airline' }, { status: 500 })
  }
}

