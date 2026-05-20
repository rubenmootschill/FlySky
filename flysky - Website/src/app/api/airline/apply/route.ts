import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveAirlineLogo } from '@/lib/airline-logo-upload'
import { notifyAirlineApplicationSubmitted } from '@/lib/discord-notify'
import { z } from 'zod'

const schema = z.object({
  airlineName: z.string().min(3).max(100),
  callsignPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,5}$/, 'Callsign prefix must be 2-5 letters.'),
  icaoCode: z
    .union([
      z.literal(''),
      z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2,4}$/, 'ICAO code must be 2-4 letters.'),
    ])
    .optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerLogoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().min(20).max(1000),
  contactName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  hub: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}$/, 'Main hub must be a 4-letter ICAO airport code.'),
})

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || ''
  let body: Record<string, unknown>
  let logoFile: File | null = null
  let bannerLogoFile: File | null = null

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData()
    const maybeLogo = formData.get('logoFile')
    const maybeBanner = formData.get('bannerLogoFile')
    logoFile = maybeLogo instanceof File && maybeLogo.size > 0 ? maybeLogo : null
    bannerLogoFile = maybeBanner instanceof File && maybeBanner.size > 0 ? maybeBanner : null
    body = {
      airlineName: formData.get('airlineName')?.toString() ?? '',
      callsignPrefix: formData.get('callsignPrefix')?.toString() ?? '',
      icaoCode: formData.get('icaoCode')?.toString() ?? '',
      website: formData.get('website')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? '',
      contactName: formData.get('contactName')?.toString() ?? '',
      contactEmail: formData.get('contactEmail')?.toString() ?? '',
      hub: formData.get('hub')?.toString() ?? '',
      logoUrl: '',
      bannerLogoUrl: '',
    }
  } else {
    body = await req.json()
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { callsignPrefix, contactEmail } = parsed.data

  // Check for duplicate prefix or email
  const existing = await prisma.airlineApplication.findFirst({
    where: { OR: [{ callsignPrefix }, { contactEmail }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'An application with this callsign prefix or email already exists.' }, { status: 409 })
  }

  let uploadedLogoUrl: string | null = null
  let uploadedBannerLogoUrl: string | null = null
  if (logoFile) {
    try {
      uploadedLogoUrl = await saveAirlineLogo(logoFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logo upload failed.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  if (bannerLogoFile) {
    try {
      uploadedBannerLogoUrl = await saveAirlineLogo(bannerLogoFile)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Banner logo upload failed.'
      return NextResponse.json({ error: message }, { status: 400 })
    }
  }

  const application = await prisma.airlineApplication.create({
    data: {
      ...parsed.data,
      icaoCode: parsed.data.icaoCode || null,
      logoUrl: uploadedLogoUrl || parsed.data.logoUrl || null,
      bannerLogoUrl: uploadedBannerLogoUrl || parsed.data.bannerLogoUrl || null,
      website: parsed.data.website || null,
    },
  })

  await notifyAirlineApplicationSubmitted({
    applicationId: application.id,
    airlineName: application.airlineName,
    callsignPrefix: application.callsignPrefix,
    contactName: application.contactName,
    contactEmail: application.contactEmail,
    hub: application.hub,
  })

  return NextResponse.json({ id: application.id }, { status: 201 })
}
