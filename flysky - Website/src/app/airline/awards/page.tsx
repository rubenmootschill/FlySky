'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Award, Plus, Edit2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

type Badge = {
  id: string
  name: string
  description: string
  color: string
  category: 'achievement' | 'route' | 'event'
  pilots: Array<{ id: string }>
}

export default function AirlineAwardsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', color: '#f59e0b', category: 'achievement' })

  // Fetch awards
  const { data: awards = [], isLoading } = useQuery({
    queryKey: ['airline-awards'],
    queryFn: () => fetch('/api/airline/awards').then((r) => r.json()),
  })

  const resetForm = () => {
    setEditingAwardId(null)
    setFormData({ name: '', description: '', color: '#f59e0b', category: 'achievement' })
  }

  // Create or update award
  const saveMutation = useMutation({
    mutationFn: () =>
      fetch('/api/airline/awards', {
        method: editingAwardId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, id: editingAwardId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['airline-awards'] })
      resetForm()
      setShowForm(false)
      toast.success(editingAwardId ? 'Award updated' : 'Award created')
    },
    onError: () => toast.error(editingAwardId ? 'Failed to update award' : 'Failed to create award'),
  })

  const handleSave = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required')
      return
    }
    saveMutation.mutate()
  }

  const startEdit = (award: Badge) => {
    setEditingAwardId(award.id)
    setFormData({
      name: award.name,
      description: award.description,
      color: award.color,
      category: award.category,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="section-title">Awards & Badges</h1>
        <button
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" /> Create Award
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900 dark:text-white">
              {editingAwardId ? 'Edit Award' : 'New Award'}
            </h2>
            {editingAwardId && (
              <button
                onClick={() => {
                  resetForm()
                  setShowForm(false)
                }}
                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Award Name</label>
              <input
                type="text"
                maxLength={50}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Gold Wings"
                className="input-field w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="input-field w-full"
              >
                <option value="achievement">Achievement</option>
                <option value="route">Route</option>
                <option value="event">Event</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea
              maxLength={200}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the award..."
              rows={3}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-12 h-10 rounded cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? (editingAwardId ? 'Saving...' : 'Creating...') : (editingAwardId ? 'Save Changes' : 'Create Award')}
            </button>
            <button
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Awards List */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">All Awards ({awards.length})</h2>

        {isLoading ? (
          <div className="card animate-pulse h-24" />
        ) : awards.length === 0 ? (
          <div className="card text-center py-12 text-slate-500">
            <Award className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="font-medium">No awards yet</p>
            <p className="text-sm mt-1">Create awards to recognize your pilot achievements</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {awards.map((award: Badge) => (
              <div key={award.id} className="card flex flex-col items-center text-center p-4 space-y-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: award.color + '20', borderColor: award.color, borderWidth: '2px' }}>
                  <Award className="w-6 h-6" style={{ color: award.color }} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{award.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{award.description}</div>
                  <div className="text-xs text-slate-400 mt-2 flex items-center justify-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: award.color }}></span>
                    {award.category}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">{award.pilots?.length ?? 0} pilots</div>
                <button
                  onClick={() => startEdit(award)}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Award
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
