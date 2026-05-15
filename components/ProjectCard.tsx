'use client'

import { useState } from 'react'
import { GitBranch, Video, ChevronUp } from 'lucide-react'
import AvatarChip from './AvatarChip'
import { Project } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface ProjectCardProps {
  project: Project
  currentUserId?: string
  onVoteChange?: (projectId: string, newCount: number, voted: boolean) => void
  onClick?: () => void
  onAuthRequired?: () => void
  onAvatarClick?: (userId: string) => void
}

export default function ProjectCard({ project, currentUserId, onVoteChange, onClick, onAuthRequired, onAvatarClick }: ProjectCardProps) {
  const [voteCount, setVoteCount] = useState(project.vote_count ?? 0)
  const [voted, setVoted] = useState(project.user_voted ?? false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const canVote = project.consider_for_voting !== false

  async function handleVote(e: React.MouseEvent) {
    e.stopPropagation()
    if (!canVote) return
    if (!currentUserId) { onAuthRequired?.(); return }
    if (loading) return
    setLoading(true)
    if (voted) {
      await supabase.from('votes').delete().match({ project_id: project.id, user_id: currentUserId })
      setVoteCount((c) => c - 1)
      setVoted(false)
      onVoteChange?.(project.id, voteCount - 1, false)
    } else {
      await supabase.from('votes').insert({ project_id: project.id, user_id: currentUserId })
      setVoteCount((c) => c + 1)
      setVoted(true)
      onVoteChange?.(project.id, voteCount + 1, true)
    }
    setLoading(false)
  }

  const user = project.users

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onClick={onClick}
    >
      {/* Cover image */}
      <div className="h-[120px] overflow-hidden" style={{ backgroundColor: 'var(--accent-bg)' }}>
        {project.cover_image_url ? (
          <img src={project.cover_image_url} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: 'var(--accent-border)' }}>
            🚀
          </div>
        )}
      </div>

      <div className="p-3">
        {/* User + week */}
        <div className="flex items-center justify-between mb-2">
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); onAvatarClick?.(user.id) }}
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            >
              <AvatarChip name={user.display_name} color={user.avatar_color} size="sm" showName />
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>W{project.weeks?.number}</span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm mb-1 line-clamp-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>

        {/* Description */}
        <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

        {/* Tag */}
        <div className="flex items-center gap-1 mb-3 flex-wrap">
          {project.tag && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              {project.tag}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <a href={project.github_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              <GitBranch size={14} style={{ color: 'var(--text-muted)' }} />
            </a>
            {project.video_url && (
              <a href={project.video_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                <Video size={14} style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
          </div>

          {canVote ? (
            <button
              onClick={handleVote}
              disabled={loading}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
              style={voted
                ? { backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }
                : { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
            >
              <ChevronUp size={12} />
              {voteCount}
            </button>
          ) : (
            <span className="text-xs px-2 py-1 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
              Not in voting
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
