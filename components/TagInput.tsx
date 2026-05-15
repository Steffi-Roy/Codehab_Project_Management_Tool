'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'

interface TagInputProps {
  label?: string
  suggestions: string[]
  value: string[]
  onChange: (tags: string[]) => void
  max?: number
  placeholder?: string
  colour?: 'purple' | 'teal'
}

const PILL_STYLES = {
  purple: { backgroundColor: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC' },
  teal: { backgroundColor: '#E1F5EE', color: '#085041', border: '0.5px solid #5DCAA5' },
}

export default function TagInput({
  label,
  suggestions,
  value,
  onChange,
  max = 8,
  placeholder = 'Add a skill… press Enter',
  colour = 'purple',
}: TagInputProps) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(tag: string) {
    const trimmed = tag.trim().slice(0, 24)
    if (!trimmed || value.includes(trimmed) || value.length >= max) return
    onChange([...value, trimmed])
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputVal)
      setInputVal('')
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const pillStyle = PILL_STYLES[colour]
  const availableSuggestions = suggestions.filter((s) => !value.includes(s))

  return (
    <div>
      {label && (
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      )}

      {/* Quick suggestions */}
      {availableSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addTag(s)}
              className="px-2.5 py-1 rounded-full text-xs transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '0.5px solid var(--border)' }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {/* Pill input row */}
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-xl cursor-text min-h-[40px]"
        style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={pillStyle}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="text-xs focus:outline-none bg-transparent flex-1"
          style={{ minWidth: '120px', color: 'var(--text-primary)' }}
          disabled={value.length >= max}
        />
      </div>
      {value.length >= max && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Max {max} tags</p>
      )}
    </div>
  )
}
