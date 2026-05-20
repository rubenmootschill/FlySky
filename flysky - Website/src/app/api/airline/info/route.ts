import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveAirlineLogo } from '@/lib/airline-logo-upload'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest?: unknown }).digest ?? '').startsWith('NEXT_REDIRECT')
  )
}

const updateAirlineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shortName: z.string().max(32).optional().or(z.literal('')),
  icaoCode: z.string().max(3).optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerLogoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  homeIcao: z.string().max(10).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  homePageContent: z.string().max(20000).optional().or(z.literal('')),
  homePageHtml: z.string().max(20000).optional().or(z.literal('')),
})

const closeAirlineSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})

export async function GET() {
  try {
    const session = await requireAuth()

    if (session.user.role !== 'ADMIN' && !session.user.email) {
      return Response.json({ error: 'Your account has no email bound to an airline owner profile.' }, { status: 400 })
    }

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
      include: {
        fleets: { include: { fleetAircraftType: true } },
      },
    })

    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    return Response.json(airline)
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    console.error('GET /api/airline/info failed:', error)
    return Response.json({ error: 'Failed to load airline info' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth()

    if (session.user.role !== 'ADMIN' && !session.user.email) {
      return Response.json({ error: 'Your account has no email bound to an airline owner profile.' }, { status: 400 })
    }

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const airline = await prisma.airline.findUnique({
      where: { id: selectedAirlineId },
    })

    if (!airline) return Response.json({ error: 'Airline not found' }, { status: 404 })

    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>
    let logoUrlFromFile: string | null = null
    let bannerLogoUrlFromFile: string | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const maybeLogo = formData.get('logoFile')
      const maybeBanner = formData.get('bannerLogoFile')
      const logoFile = maybeLogo instanceof File && maybeLogo.size > 0 ? maybeLogo : null
      const bannerLogoFile = maybeBanner instanceof File && maybeBanner.size > 0 ? maybeBanner : null

      if (logoFile) {
        try {
          logoUrlFromFile = await saveAirlineLogo(logoFile)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Logo upload failed.'
          return Response.json({ error: message }, { status: 400 })
        }
      }

      if (bannerLogoFile) {
        try {
          bannerLogoUrlFromFile = await saveAirlineLogo(bannerLogoFile)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Banner logo upload failed.'
          return Response.json({ error: message }, { status: 400 })
        }
      }

      body = {
        name: formData.get('name')?.toString() ?? undefined,
        shortName: formData.get('shortName')?.toString() ?? '',
        icaoCode: formData.get('icaoCode')?.toString() ?? '',
        website: formData.get('website')?.toString() ?? '',
        homeIcao: formData.get('homeIcao')?.toString() ?? '',
        description: formData.get('description')?.toString() ?? '',
        homePageContent: formData.get('homePageContent')?.toString() ?? '',
        homePageHtml: formData.get('homePageHtml')?.toString() ?? '',
      }
    } else {
      body = await request.json()
    }

    const parsed = updateAirlineSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const { name, shortName, icaoCode, logoUrl, bannerLogoUrl, website, homeIcao, description, homePageContent, homePageHtml } = parsed.data

    const updated = await prisma.airline.update({
      where: { id: airline.id },
      data: {
        ...(name && { name }),
        ...(shortName !== undefined && { shortName: shortName || null }),
        ...(icaoCode !== undefined && { icaoCode: icaoCode || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(bannerLogoUrl !== undefined && { bannerLogoUrl: bannerLogoUrl || null }),
        ...(logoUrlFromFile && { logoUrl: logoUrlFromFile }),
        ...(bannerLogoUrlFromFile && { bannerLogoUrl: bannerLogoUrlFromFile }),
        ...(website !== undefined && { website: website || null }),
        ...(homeIcao !== undefined && { homeIcao: homeIcao || null }),
        ...(description !== undefined && { description: description || null }),
        ...(homePageContent !== undefined && { homePageContent: homePageContent || null }),
        ...(homePageHtml !== undefined && { homePageHtml: homePageHtml || null }),
      },
      include: {
        fleets: { include: { fleetAircraftType: true } },
      },
    })

    return Response.json(updated)
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    console.error('PATCH /api/airline/info failed:', error)
    return Response.json({ error: 'Failed to update airline info' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth()

    if (!session.user.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) {
      return Response.json({ error: 'Airline not found' }, { status: 404 })
    }

    const payload = await request.json().catch(() => null)
    const parsed = closeAirlineSchema.safeParse(payload)
    if (!parsed.success) {
      return Response.json({ error: 'Password is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    const isValidPassword = await bcrypt.compare(parsed.data.password, user.password)
    if (!isValidPassword) {
      return Response.json({ error: 'Invalid password' }, { status: 401 })
    }

    const closedAirline = await prisma.airline.update({
      where: { id: selectedAirlineId },
      data: {
        status: 'REJECTED',
        ownerEmail: null,
      },
    })

    ;(await cookies()).delete('activeAirlineId')

    return Response.json({
      success: true,
      airlineId: closedAirline.id,
      status: closedAirline.status,
    })
  } catch (error) {
    if (isNextRedirectError(error)) throw error
    console.error('DELETE /api/airline/info failed:', error)
    return Response.json({ error: 'Failed to close airline' }, { status: 500 })
  }
}
