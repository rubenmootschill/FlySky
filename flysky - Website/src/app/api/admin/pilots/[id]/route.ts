import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const updatePilotSchema = z.object({
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RETIRED']),
  banReason: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params
    const body = await req.json();
    const data = updatePilotSchema.parse(body);

    const pilot = await prisma.pilot.update({
      where: { id },
      data: {
        status: data.status,
        banReason: data.banReason,
        bannedAt: (data.status === 'SUSPENDED' || data.status === 'RETIRED') ? new Date() : null,
      },
    });

    return NextResponse.json(pilot);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update pilot' }, { status: 500 });
  }
}
