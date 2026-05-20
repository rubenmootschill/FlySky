import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { resolveActiveAirlineId } from '@/lib/active-airline'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  imageUrl: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireAuth()
    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'No airline selected' }, { status: 400 })

    const body = await request.json()
    const validated = createPostSchema.parse(body)

    const post = await prisma.airlinePost.create({
      data: {
        airlineId: selectedAirlineId,
        title: validated.title,
        description: validated.description,
        imageUrl: validated.imageUrl || null,
      },
    })

    return Response.json(post, { status: 201 })
  } catch (error) {
    console.error('Error creating post:', error)
    if (error instanceof z.ZodError) {
      return Response.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    return Response.json({ error: 'Failed to create post' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth()
    const selectedAirlineId = await resolveActiveAirlineId(session.user)
    if (!selectedAirlineId) return Response.json({ error: 'No airline selected' }, { status: 400 })

    const posts = await prisma.airlinePost.findMany({
      where: { airlineId: selectedAirlineId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return Response.json(posts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return Response.json({ error: 'Failed to fetch posts' }, { status: 500 })
  }
}
