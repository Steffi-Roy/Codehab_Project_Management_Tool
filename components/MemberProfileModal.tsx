'use client'

import { useState, useEffect } from 'react'
import { X, GitBranch } from 'lucide-react'
import AvatarChip from './AvatarChip'
import ProjectCard from './ProjectCard'
import { User, Project } from '@/types'
import { createClient } from '@/lib/supabase/client'

interface MemberProfileModalProps {
  userId: string
  onClose: () => void
}

export default function MemberProfileModal({ userId, onClose }: MemberProfileModalProps) {
  const [member, setMember] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: profile }, { data: projectsData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).single(),
        supabase.from('projects').select('*, users(*), weeks(*)').eq('user_id', userId).order('created_at', { ascending: false }),
      ])
      if (profile) setMember(profile as User)
      if (projectsData) {
        const ids = projectsData.map((p: Project) => p.id)
        const { data: votes } = await supabase.from('votes').select('*').in('project_id', ids)
        const enriched = projectsData.map((p: Project) => ({
          ...p, vote_count: votes?.filter((v) => v.project_id === p.id).length ?? 0, user_voted: false,
        }))
        setProjects(enriched as Project[])
      }
    }
    load()
  }, [userId])

  if (!member) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <AvatarChip name={member.display_name} color={member.avatar_color} size="lg" />
              <div>
                <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{member.display_name}</h2>
                {member.handle && <p style={{ color: 'var(--text-muted)' }}>@{member.handle}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:opacity-70">
              <X size={18} style={{ color: 'var(--text-secondary)' }} />
            </button>
          </div>

          {member.about && <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{member.about}</p>}

          {/* Links */}
          <div className="flex gap-3 mb-6">
            {member.linkedin_url && (
              <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer"
                 className="text-sm px-3 py-1.5 rounded-lg transition-colors"
                 style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                LinkedIn
              </a>
            )}
            {member.github_url && (
              <a href={member.github_url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                 style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                <GitBranch size={13} /> GitHub
              </a>
            )}
          </div>

          {/* Projects */}
          {projects.length > 0 && (
            <>
              <h3 className="font-medium mb-4 text-sm uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Submissions ({projects.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
