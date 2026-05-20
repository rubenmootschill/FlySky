import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    await prisma.airport.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to delete airport' },
      { status: 400 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await req.json()

    const airport = await prisma.airport.update({
      where: { id },
      data: {
        active: body.active ?? undefined,
        name: body.name ?? undefined,
        city: body.city ?? undefined,
        country: body.country ?? undefined,
        lat: body.lat ? parseFloat(body.lat) : undefined,
        lng: body.lng ? parseFloat(body.lng) : undefined,
      },
    })

    return NextResponse.json(airport)
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update airport' },
      { status: 400 }
    )
  }
}
