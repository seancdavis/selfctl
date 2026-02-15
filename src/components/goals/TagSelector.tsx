import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { tagsApi } from '@/lib/api'
import { useToast } from '@/contexts/ToastContext'
import type { Tag } from '@/types'

interface TagSelectorProps {
  categoryId: number | null
  selectedTags: string[]
  onChange: (tags: string[]) => void
}

export function TagSelector({ categoryId, selectedTags, onChange }: TagSelectorProps) {
  const toast = useToast()
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!categoryId) {
      setAvailableTags([])
      return
    }
    tagsApi.list(categoryId).then(setAvailableTags).catch(() => {})
  }, [categoryId])

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter((t) => t !== tagName))
    } else {
      onChange([...selectedTags, tagName])
    }
  }

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim() || !categoryId) return

    setCreating(true)
    try {
      const tag = await tagsApi.create({ name: newTagName.trim(), categoryId })
      setAvailableTags((prev) => [...prev, tag])
      onChange([...selectedTags, tag.name])
      setNewTagName('')
      setShowNewTag(false)
      toast.success('tag created')
    } catch {
      toast.error('failed to create tag')
    } finally {
      setCreating(false)
    }
  }

  if (!categoryId) return null

  const sortedTags = [...availableTags].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {sortedTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.name)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.name)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                isSelected
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {tag.name}
              {isSelected && <X className="w-2.5 h-2.5" />}
            </button>
          )
        })}
        {!showNewTag && (
          <button
            type="button"
            onClick={() => setShowNewTag(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" />
            tag
          </button>
        )}
      </div>

      {showNewTag && (
        <form onSubmit={handleCreateTag} className="flex items-center gap-2 mt-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="new tag name"
            className="flex-1 px-2 py-1 border border-zinc-700 bg-zinc-900 rounded text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTagName.trim() || creating}
            className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono rounded hover:bg-emerald-500/20 disabled:opacity-40 transition-colors"
          >
            {creating ? '...' : 'add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowNewTag(false)
              setNewTagName('')
            }}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  )
}
