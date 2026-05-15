'use client'

import { useState, useEffect } from 'react'
import { Search, X, GitBranch } from "lucide-react"
import Navbar from '@/components/Navbar'
import AvatarChip from '@/components/AvatarChip'
import EmailPrompt from '@/components/EmailPrompt'
import ProjectCard from '@/components/ProjectCard'
import { createClient } from '@/lib/supabase/client'
import { User, Project } from '@/types'

export default function MembersPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<User | null>(null)
  const [memberProjects, setMemberProjects] = useState<Project[]>([])
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !session.user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        if (profile) setCurrentUser(profile as User)
      } else {
        setCurrentUser(null)
      }
    })

    async function loadData() {
      const { data } = await supabase.from('users').select('*').order('created_at')
      if (data) setMembers(data as User[])
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  async function openMember(member: User) {
    setSelectedMember(member)
    const { data } = await supabase
      .from('projects')
      .select('*, users(*), weeks(*)')
      .eq('user_id', member.id)
      .order('created_at', { ascending: false })
    if (data) {
      const projectIds = data.map((p: Project) => p.id)
      const { data: votes } = await supabase.from('votes').select('*').in('project_id', projectIds)
      const enriched = data.map((p: Project) => ({
        ...p, vote_count: votes?.filter((v) => v.project_id === p.id).length ?? 0, user_voted: false,
      }))
      setMemberProjects(enriched as Project[])
    }
  }

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    return (
      m.display_name.toLowerCase().includes(q) ||
      (m.handle || '').toLowerCase().includes(q) ||
      (m.about || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Members</h1>

        {/* Search */}
        <div className="relative mb-8">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#AFA9EC] bg-white text-sm"
          />
        </div>

        {/* Member grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {filtered.map((member) => (
            <div
              key={member.id}
              onClick={() => openMember(member)}
              className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <AvatarChip name={member.display_name} color={member.avatar_color} size="lg" />
                <div className="flex gap-2">
                  {member.linkedin_url && (
                    <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-gray-400 hover:text-[#3C3489]">
                      in
                    </a>
                  )}
                  {member.github_url && (
                    <a href={member.github_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      <GitBranch size={14} className="text-gray-400 hover:text-[#3C3489]" />
                    </a>
                  )}
                </div>
              </div>
              <h3 className="font-medium text-gray-800">{member.display_name}</h3>
              {member.handle && <p className="text-xs text-gray-400 mb-2">@{member.handle}</p>}
              {member.about && <p className="text-sm text-gray-500 line-clamp-2">{member.about}</p>}
            </div>
          ))}
        </div>
      </main>

      {/* Member modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <AvatarChip name={selectedMember.display_name} color={selectedMember.avatar_color} size="lg" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{selectedMember.display_name}</h2>
                    {selectedMember.handle && <p className="text-gray-400">@{selectedMember.handle}</p>}
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-gray-100 rounded-xl">
                  <X size={18} />
                </button>
              </div>

              {selectedMember.about && <p className="text-gray-600 mb-4">{selectedMember.about}</p>}

              <div className="flex gap-3 mb-6">
                {selectedMember.linkedin_url && (
                  <a href={selectedMember.linkedin_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-[#EEEDFE] hover:text-[#3C3489]">
                    LinkedIn
                  </a>
                )}
                {selectedMember.github_url && (
                  <a href={selectedMember.github_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-[#EEEDFE] hover:text-[#3C3489]">
                    <GitBranch size={14} /> GitHub
                  </a>
                )}
              </div>

              {memberProjects.length > 0 && (
                <>
                  <h3 className="font-medium text-gray-700 mb-4">Projects</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {memberProjects.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
