import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const createAircraftSchema = z.object({
  icaoCode: z.string().min(2).max(4).toUpperCase(),
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  passengers: z.number().int().positive(),
  cargoVolume: z.number().default(0),
  cargoWeight: z.number().default(0),
  imageUrl: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();

    const aircraft = await prisma.fleetAircraftType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(aircraft);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const data = createAircraftSchema.parse(body);

    const aircraft = await prisma.fleetAircraftType.create({
      data,
    });

    return NextResponse.json(aircraft);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create aircraft' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Aircraft ID required' }, { status: 400 });
    }

    const body = await req.json();
    const data = createAircraftSchema.parse(body);

    const aircraft = await prisma.fleetAircraftType.update({
      where: { id },
      data,
    });

    return NextResponse.json(aircraft);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update aircraft' }, { status: 500 });
  }
}
