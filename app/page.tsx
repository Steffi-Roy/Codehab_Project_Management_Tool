'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import ProjectCard from '@/components/ProjectCard'
import ProjectModal from '@/components/ProjectModal'
import EmailPrompt from '@/components/EmailPrompt'
import MemberProfileModal from '@/components/MemberProfileModal'
import { createClient } from '@/lib/supabase/client'
import { shuffleArray, getCountdown, formatDeadline } from '@/lib/utils'
import { Project, Week, User } from '@/types'

const TAGS = ['All', 'Tool', 'Design', 'Community', 'Collab open']

function weekStatus(week: Week): 'past' | 'active' | 'future' {
  const now = new Date()
  if (now > new Date(week.voting_close)) return 'past'
  if (week.is_active) return 'active'
  return now < new Date(week.submission_deadline) ? 'future' : 'active'
}

function votingChip(week: Week) {
  const n = new Date()
  if (n < new Date(week.voting_open)) {
    return { label: `Open · closes ${formatDeadline(week.submission_deadline)}`, style: { backgroundColor: '#E1F5EE', color: '#085041' } }
  }
  if (n < new Date(week.voting_close)) {
    return { label: `Voting closes in ${getCountdown(week.voting_close)}`, style: { backgroundColor: '#FAEEDA', color: '#633806' } }
  }
  return { label: 'Closed', style: { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' } }
}

export default function HomePage() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [activeWeekId, setActiveWeekId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [shuffled, setShuffled] = useState<Project[]>([])
  const [tag, setTag] = useState('All')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [memberModalUserId, setMemberModalUserId] = useState<string | null>(null)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
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
      const { data: weeksData } = await supabase.from('weeks').select('*').order('number')
      if (weeksData) {
        setWeeks(weeksData as Week[])
        const active = weeksData.find((w: Week) => w.is_active)
        setActiveWeekId(active?.id ?? weeksData[weeksData.length - 1]?.id ?? null)
      }
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!activeWeekId) return
    async function loadProjects() {
      const userId = currentUser?.id
      const { data } = await supabase
        .from('projects')
        .select('*, users(*), weeks(*)')
        .eq('week_id', activeWeekId)
        .order('created_at', { ascending: false })

      if (data) {
        const projectIds = data.map((p: Project) => p.id)
        const { data: votes } = await supabase.from('votes').select('*').in('project_id', projectIds)
        const enriched = data.map((p: Project) => {
          const pVotes = votes?.filter((v) => v.project_id === p.id) ?? []
          return { ...p, vote_count: pVotes.length, user_voted: userId ? pVotes.some((v) => v.user_id === userId) : false }
        })
        setProjects(enriched as Project[])
        setShuffled(shuffleArray(enriched) as Project[])
        setAlreadySubmitted(userId ? data.some((p: Project) => p.user_id === userId) : false)
      }
    }
    loadProjects()

    const channel = supabase
      .channel(`votes-week-${activeWeekId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, loadProjects)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeWeekId, currentUser?.id])

  const filtered = shuffled.filter((p) => {
    if (tag === 'All') return true
    if (tag === 'Collab open') return p.collab_open
    return p.tag === tag
  })

  const selectedWeek = weeks.find((w) => w.id === activeWeekId)
  const now = new Date()
  const isSubmissionOpen = selectedWeek ? now < new Date(selectedWeek.submission_deadline) : false

  return (
    <>
      <Navbar
        user={currentUser}
        onSignIn={() => setShowEmailPrompt(true)}
        onAvatarClick={() => currentUser && setMemberModalUserId(currentUser.id)}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div>
          {/* Week tabs */}
          <div className="relative mb-4">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {weeks.map((week) => {
                const status = weekStatus(week)
                const isSelected = activeWeekId === week.id
                return (
                  <button
                    key={week.id}
                    onClick={() => setActiveWeekId(week.id)}
                    className="px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors flex-shrink-0"
                    style={
                      isSelected
                        ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)', fontWeight: 600 }
                        : status === 'past'
                        ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '0.5px solid var(--border)', opacity: 0.4 }
                        : status === 'future'
                        ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '0.5px solid var(--border)', opacity: 0.7 }
                        : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }
                    }
                  >
                    Wk {week.number} · {week.theme.replace(/^Week \d+ · /, '')}
                  </button>
                )
              })}
            </div>
            <div className="absolute right-0 top-0 bottom-1 w-8 pointer-events-none" style={{ background: 'linear-gradient(to right, transparent, var(--bg-page))' }} />
          </div>

          {/* Week banner */}
          {selectedWeek && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                  Wk {selectedWeek.number}
                </span>
                <div>
                  <h2 style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '15px' }}>{selectedWeek.theme.replace(/^Week \d+ · /, '')}</h2>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                    {isSubmissionOpen ? ` · Submit by ${formatDeadline(selectedWeek.submission_deadline)}` : ' · Submissions closed'}
                  </p>
                </div>
              </div>
              {(() => {
                const chip = votingChip(selectedWeek)
                return (
                  <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={chip.style}>{chip.label}</span>
                )
              })()}
            </div>
          )}

          {/* Submit bar */}
          {isSubmissionOpen && selectedWeek && !alreadySubmitted && (
            <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: '#E1F5EE', border: '0.5px solid #5DCAA5' }}>
              <p className="text-sm font-medium" style={{ color: '#085041' }}>
                Submit your week {selectedWeek.number} project before {formatDeadline(selectedWeek.submission_deadline)}
              </p>
              <Link href="/submit" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: '#085041', color: '#E1F5EE' }}>
                Submit <ArrowRight size={14} />
              </Link>
            </div>
          )}

          {/* Filter chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(t)}
                className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={
                  tag === t
                    ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)' }
                    : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {/* Card grid */}
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={currentUser?.id}
                onClick={() => setSelectedProject(project)}
                onAuthRequired={() => setShowEmailPrompt(true)}
                onAvatarClick={(uid) => setMemberModalUserId(uid)}
              />
            ))}

            {isSubmissionOpen && !alreadySubmitted && (
              <Link
                href="/submit"
                className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 p-8 transition-colors min-h-[200px]"
                style={{ borderColor: 'var(--accent-border)', color: 'var(--accent-border)' }}
              >
                <span className="text-3xl">+</span>
                <span className="text-sm font-medium">Add your project</span>
              </Link>
            )}

            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p className="text-4xl mb-4">🌱</p>
                <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>No projects yet this week</p>
                <p className="text-sm mt-1">Be the first to submit — the board opens up when you do</p>
                {isSubmissionOpen && (
                  <Link href="/submit" className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ backgroundColor: '#085041', color: '#E1F5EE' }}>
                    Submit your project <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </main>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          currentUser={currentUser}
          onClose={() => setSelectedProject(null)}
          onAuthRequired={() => setShowEmailPrompt(true)}
        />
      )}

      {memberModalUserId && (
        <MemberProfileModal userId={memberModalUserId} onClose={() => setMemberModalUserId(null)} />
      )}

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
