'use client'

import { useState } from 'react'
import { X, GitBranch, Video, ChevronUp } from 'lucide-react'
import AvatarChip from './AvatarChip'
import { Project, User } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface ProjectModalProps {
  project: Project
  currentUser: User | null
  onClose: () => void
  onAuthRequired?: () => void
}

export default function ProjectModal({ project, currentUser, onClose, onAuthRequired }: ProjectModalProps) {
  const [voteCount, setVoteCount] = useState(project.vote_count ?? 0)
  const [voted, setVoted] = useState(project.user_voted ?? false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const canVote = project.consider_for_voting !== false

  async function handleVote() {
    if (!canVote) return
    if (!currentUser) { onAuthRequired?.(); return }
    if (loading) return
    setLoading(true)
    if (voted) {
      await supabase.from('votes').delete().match({ project_id: project.id, user_id: currentUser.id })
      setVoteCount((c) => c - 1)
      setVoted(false)
    } else {
      await supabase.from('votes').insert({ project_id: project.id, user_id: currentUser.id })
      setVoteCount((c) => c + 1)
      setVoted(true)
    }
    setLoading(false)
  }

  function getVideoEmbed(url: string) {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    return null
  }

  const user = project.users
  const videoEmbed = project.video_url ? getVideoEmbed(project.video_url) : null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover */}
        <div className="relative h-48" style={{ backgroundColor: 'var(--accent-bg)' }}>
          {project.cover_image_url ? (
            <img src={project.cover_image_url} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🚀</div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full p-1.5"
            style={{ backgroundColor: 'var(--bg-card)', opacity: 0.9 }}
          >
            <X size={18} style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h2>
              {project.tag && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                  {project.tag}
                </span>
              )}
            </div>

            {canVote ? (
              <button
                onClick={handleVote}
                disabled={loading}
                className="flex items-center gap-1 px-4 py-2 rounded-xl font-medium transition-colors"
                style={voted
                  ? { backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }
                  : { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
              >
                <ChevronUp size={16} />
                {voteCount}
              </button>
            ) : (
              <span className="text-xs px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                Not in voting
              </span>
            )}
          </div>

          {/* Description */}
          <p className="mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

          {/* Links */}
          <div className="flex items-center gap-3 mb-6">
            <a href={project.github_url} target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
               style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
              <GitBranch size={14} /> GitHub
            </a>
            {project.video_url && (
              <a href={project.video_url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
                 style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                <Video size={14} /> Video
              </a>
            )}
          </div>

          {/* Video embed */}
          {videoEmbed && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <iframe src={videoEmbed} className="w-full aspect-video" allowFullScreen />
            </div>
          )}

          {/* Builder */}
          {user && (
            <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--accent-bg)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--accent-text)' }}>Builder</h3>
              <div className="flex items-start gap-3">
                <AvatarChip name={user.display_name} color={user.avatar_color} size="lg" />
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.display_name}</p>
                  {user.handle && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{user.handle}</p>}
                  {user.about && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{user.about}</p>}
                  <div className="flex gap-3 mt-2">
                    {user.linkedin_url && (
                      <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs hover:underline" style={{ color: 'var(--accent-text)' }}>LinkedIn</a>
                    )}
                    {user.github_url && (
                      <a href={user.github_url} target="_blank" rel="noopener noreferrer"
                         className="text-xs hover:underline" style={{ color: 'var(--accent-text)' }}>GitHub</a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
