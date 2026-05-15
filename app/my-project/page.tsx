'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Check, Plus, Trash2, ArrowRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EmailPrompt from '@/components/EmailPrompt'
import ProjectCard from '@/components/ProjectCard'
import { createClient } from '@/lib/supabase/client'
import { User, Project, Week, Task } from '@/types'

export default function MyProjectPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [taskError, setTaskError] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !session.user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        if (profile) {
          setCurrentUser(profile as User)

          const [{ data: projectsData }, { data: tasksData }] = await Promise.all([
            supabase.from('projects').select('*, users(*), weeks(*)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
            supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at'),
          ])

          if (projectsData) {
            const ids = projectsData.map((p: Project) => p.id)
            const { data: votes } = await supabase.from('votes').select('*').in('project_id', ids)
            const enriched = projectsData.map((p: Project) => ({
              ...p, vote_count: votes?.filter((v) => v.project_id === p.id).length ?? 0, user_voted: false,
            }))
            setProjects(enriched as Project[])
          }
          if (tasksData) setTasks(tasksData as Task[])
        }
      } else {
        setCurrentUser(null)
      }
      setLoading(false)
    })

    async function loadData() {
      const { data: weeksData } = await supabase.from('weeks').select('*').order('number')
      if (weeksData) setWeeks(weeksData as Week[])
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  function isEditable(project: Project) {
    const week = weeks.find((w) => w.id === project.week_id)
    if (!week) return false
    return new Date() < new Date(week.submission_deadline)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    const text = newTask.trim()
    if (!text) return
    setTaskError('')

    const optimistic: Task = { id: `opt-${Date.now()}`, user_id: currentUser.id, text, is_done: false, created_at: new Date().toISOString() }
    setTasks((prev) => [...prev, optimistic])
    setNewTask('')

    const { data, error } = await supabase.from('tasks').insert({ user_id: currentUser.id, text }).select().single()
    if (error || !data) {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id))
      setTaskError("Couldn't save — try again")
    } else {
      setTasks((prev) => prev.map((t) => t.id === optimistic.id ? data as Task : t))
    }
  }

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  if (loading) return (
    <>
      <Navbar user={null} />
      <div className="flex items-center justify-center min-h-[50vh]">
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    </>
  )

  if (!currentUser) return (
    <>
      <Navbar user={null} onSignIn={() => setShowEmailPrompt(true)} />
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to see your projects</h2>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>Track your weekly submissions and personal tasks.</p>
        <button
          onClick={() => setShowEmailPrompt(true)}
          className="px-6 py-3 rounded-xl font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}
        >
          Sign in
        </button>
      </div>
      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )

  const activeWeek = weeks.find((w) => w.is_active) ?? weeks[weeks.length - 1]
  const hasSubmittedThisWeek = activeWeek ? projects.some((p) => p.week_id === activeWeek.id) : false
  const isSubmissionOpen = activeWeek ? new Date() < new Date(activeWeek.submission_deadline) : false

  const projectsByWeek = weeks.map((w) => ({
    week: w,
    project: projects.find((p) => p.week_id === w.id) ?? null,
  }))

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-[22px] font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>My Projects</h1>

        {/* Submit CTA when no submission this week */}
        {isSubmissionOpen && !hasSubmittedThisWeek && activeWeek && (
          <div className="rounded-2xl p-8 mb-8 text-center" style={{ backgroundColor: '#E1F5EE', border: '0.5px solid #5DCAA5' }}>
            <p className="text-3xl mb-3">🌱</p>
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#085041' }}>You haven't submitted yet this week</h2>
            <p className="text-sm mb-5" style={{ color: '#085041', opacity: 0.8 }}>
              Share what you're building — the cohort wants to see it
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm"
              style={{ backgroundColor: '#085041', color: '#E1F5EE' }}
            >
              Submit your project <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Week timeline */}
        <div className="mb-10">
          {/* Timeline dots row */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {weeks.map((w) => {
              const hasProject = projects.some((p) => p.week_id === w.id)
              return (
                <div key={w.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={hasProject
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }
                      : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '0.5px solid var(--border)' }
                    }
                  >
                    {w.number}
                  </div>
                  <span className="text-xs" style={{ color: hasProject ? 'var(--accent-text)' : 'var(--text-muted)' }}>
                    Wk {w.number}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Projects list */}
          <div className="space-y-6">
            {projectsByWeek.filter(({ project }) => project !== null).map(({ week, project }) => project && (
              <div key={week.id} className="flex gap-4">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    {week.number}
                  </div>
                  <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'var(--border)' }} />
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{week.theme}</h3>
                    {isEditable(project) && (
                      <button
                        onClick={() => router.push(`/submit?edit=${project.id}`)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg"
                        style={{ color: 'var(--accent-text)', backgroundColor: 'var(--accent-bg)' }}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="max-w-xs">
                    <ProjectCard project={project} currentUserId={currentUser?.id} />
                  </div>
                </div>
              </div>
            ))}

            {projects.length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-[13px]">No submissions yet — start with this week's theme</p>
              </div>
            )}
          </div>
        </div>

        {/* Tasks section */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
          <h2 className="text-[22px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>My Tasks</h2>
          <form onSubmit={addTask} className="flex gap-2 mb-5">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 text-sm px-4 py-2.5 rounded-xl focus:outline-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
            <button type="submit" className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              <Plus size={16} />
            </button>
          </form>
          {taskError && <p className="text-xs mb-3" style={{ color: '#ED93B1' }}>{taskError}</p>}

          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 group">
                <button
                  onClick={() => toggleTask(task)}
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                  style={task.is_done ? { backgroundColor: '#5DCAA5', borderColor: '#5DCAA5' } : { borderColor: 'var(--border)' }}
                >
                  {task.is_done && <Check size={10} color="white" />}
                </button>
                <span className="text-sm flex-1" style={{
                  color: task.is_done ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: task.is_done ? 'line-through' : 'none',
                }}>
                  {task.text}
                </span>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="py-2 px-3 rounded-xl" style={{ border: '0.5px dashed var(--border)' }}>
                <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>No tasks yet — add one above</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
