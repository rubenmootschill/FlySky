'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Send } from 'lucide-react'

interface CreatePostFormProps {
  onPostCreated?: () => void
}

export default function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const createPostMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; imageUrl?: string }) => {
      const res = await fetch('/api/airline/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create post')
      return res.json()
    },
    onSuccess: () => {
      setTitle('')
      setDescription('')
      setImageUrl('')
      setPreviewImage(null)
      onPostCreated?.()
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        setPreviewImage(base64)
        setImageUrl(base64)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    createPostMutation.mutate({ title, description, imageUrl: imageUrl || undefined })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900 mb-4">Create a Post</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter post description..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Image (Optional)</label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg px-4 py-6 cursor-pointer hover:border-blue-400 transition-colors">
              <div className="flex flex-col items-center gap-1">
                <ImagePlus className="w-5 h-5 text-slate-400" />
                <span className="text-xs text-slate-500">Upload image</span>
              </div>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
            {previewImage && (
              <img src={previewImage} alt="Preview" className="w-16 h-16 rounded-lg object-cover" />
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!title.trim() || !description.trim() || createPostMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2 rounded-lg transition-colors"
        >
          <Send className="w-4 h-4" />
          {createPostMutation.isPending ? 'Posting...' : 'Post'}
        </button>

        {createPostMutation.isError && (
          <p className="text-sm text-red-600">Failed to create post. Please try again.</p>
        )}
      </form>
    </div>
  )
}
