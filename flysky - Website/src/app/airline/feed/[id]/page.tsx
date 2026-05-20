import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  const { id } = await params

  const post = await prisma.airlinePost.findUnique({
    where: { id },
  })

  if (!post) {
    return redirect('/airline/feed')
  }

  return (
    <div className="max-w-2xl">
      <Link href="/airline/feed" className="inline-flex items-center gap-2 text-sky-500 hover:text-sky-400 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Feed
      </Link>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        {post.imageUrl && (
          <img src={post.imageUrl} alt={post.title} className="w-full h-96 object-cover" />
        )}

        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
            <div className="text-sm text-slate-500 mt-2">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-slate-700 whitespace-pre-wrap">{post.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
