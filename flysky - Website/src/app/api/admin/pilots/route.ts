import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await requireAdmin();

    const pilots = await prisma.pilot.findMany({
      include: {
        user: {
          select: { email: true },
        },
        rank: {
          select: { name: true, code: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return NextResponse.json(pilots);
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
