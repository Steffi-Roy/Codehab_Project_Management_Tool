'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Check, Plus, Trash2, ArrowRight, X, Upload, RefreshCw, Sparkles } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EmailPrompt from '@/components/EmailPrompt'
import ProjectCard from '@/components/ProjectCard'
import TagInput from '@/components/TagInput'
import { createClient } from '@/lib/supabase/client'
import { User, Project, Week, Task } from '@/types'

const TAG_SUGGESTIONS = ['Tool', 'Community', 'Design', 'AI', 'Mobile', 'API', 'Open source', 'SaaS']

// ── Add Project Modal ────────────────────────────────────────────────────────

function AddProjectModal({
  currentUser,
  activeWeek,
  onClose,
  onCreated,
}: {
  currentUser: User
  activeWeek: Week
  onClose: () => void
  onCreated: (project: Project) => void
}) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverTab, setCoverTab] = useState<'upload' | 'ai'>('upload')
  const [polishing, setPolishing] = useState(false)
  const [polishedText, setPolishedText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { setError('File must be under 4 MB'); return }
    const ext = file.name.split('.').pop()
    const path = `covers/${currentUser.id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('project-covers').upload(path, file)
    if (uploadError) { setError(uploadError.message); return }
    const { data } = supabase.storage.from('project-covers').getPublicUrl(path)
    setCoverImageUrl(data.publicUrl)
  }

  async function handlePolish() {
    if (!description.trim()) return
    setPolishing(true)
    try {
      const res = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      setPolishedText(data.result || '')
    } catch {
      setError('Failed to polish description')
    }
    setPolishing(false)
  }

  async function handleGenerateImage() {
    if (!title) return
    setGenerating(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      })
      const data = await res.json()
      if (data.url) setCoverImageUrl(data.url)
      else setError('Image generation failed')
    } catch {
      setError('Failed to generate image')
    }
    setGenerating(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!githubUrl.includes('github.com')) { setError('Please enter a valid GitHub URL'); return }
    setSubmitting(true)
    setError('')

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        user_id: currentUser.id,
        week_id: activeWeek.id,
        title,
        description,
        cover_image_url: coverImageUrl || null,
        github_url: githubUrl,
        video_url: videoUrl || null,
        tag: tags[0] || 'Other',
        collab_open: false,
      })
      .select('*, users(*), weeks(*)')
      .single()

    if (insertError) { setError(insertError.message); setSubmitting(false); return }
    onCreated(data as Project)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Add project</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Wk {activeWeek.number} · {activeWeek.theme.replace(/^Week \d+ · /, '')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title *</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="My awesome project"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
          </div>

          {/* Description + Polish */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description *</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} required
              rows={3} placeholder="What did you build?"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none resize-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
            <button
              type="button" onClick={handlePolish}
              disabled={polishing || !description.trim()}
              className="mt-1.5 flex items-center gap-1.5 text-xs disabled:opacity-40 transition-opacity"
              style={{ color: 'var(--accent-text)' }}
            >
              <Sparkles size={12} /> {polishing ? 'Polishing…' : 'Polish with AI'}
            </button>

            {polishedText && (
              <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: '#E1F5EE', border: '0.5px solid #5DCAA5' }}>
                <p className="text-sm mb-3 leading-relaxed" style={{ color: '#085041' }}>{polishedText}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setDescription(polishedText); setPolishedText('') }}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#085041', color: '#E1F5EE' }}>
                    <Check size={11} /> Use this
                  </button>
                  <button type="button" onClick={() => setPolishedText('')}
                    className="text-xs px-3 py-1.5 rounded-lg" style={{ color: '#085041', border: '0.5px solid #5DCAA5' }}>
                    Discard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* GitHub */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>GitHub URL *</label>
            <input
              value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} required
              placeholder="https://github.com/username/repo"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Video URL <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
            <input
              value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
          </div>

          {/* Cover image */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Cover image <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <div className="flex gap-2 mb-3">
              {(['upload', 'ai'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setCoverTab(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={coverTab === t
                    ? { backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }
                    : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}>
                  {t === 'upload' ? '⬆ Upload' : '✦ Generate with AI'}
                </button>
              ))}
            </div>

            {coverTab === 'upload' ? (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors"
                  style={{ borderColor: coverImageUrl ? '#5DCAA5' : 'var(--border)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.backgroundColor = 'var(--accent-bg)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = coverImageUrl ? '#5DCAA5' : 'var(--border)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Cover" className="h-24 mx-auto rounded-lg object-cover" />
                  ) : (
                    <>
                      <Upload size={20} className="mx-auto mb-1.5" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to upload PNG / JPG / GIF (max 4 MB)</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </div>
            ) : (
              <div>
                {coverImageUrl && (
                  <img src={coverImageUrl} alt="Generated cover" className="w-full h-32 object-cover rounded-xl mb-3" />
                )}
                <button
                  type="button" onClick={handleGenerateImage}
                  disabled={generating || !title}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
                >
                  <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
                  {generating ? 'Generating…' : coverImageUrl ? 'Regenerate' : 'Generate cover art'}
                </button>
              </div>
            )}
          </div>

          {/* Tag */}
          <TagInput
            label="Tag (optional)"
            suggestions={TAG_SUGGESTIONS}
            value={tags}
            onChange={setTags}
            max={1}
            placeholder="Pick or type a tag…"
            colour="purple"
          />

          {error && <p className="text-xs" style={{ color: '#ED93B1' }}>{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}
            >
              {submitting ? 'Submitting…' : 'Submit project'}
            </button>
            <button
              type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyProjectPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [taskError, setTaskError] = useState('')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [showAddProject, setShowAddProject] = useState(false)
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
            const { data: votes } = ids.length
              ? await supabase.from('votes').select('*').in('project_id', ids)
              : { data: [] }
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
      const { data } = await supabase.from('weeks').select('*').order('number')
      if (data) setWeeks(data as Week[])
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  function isEditable(project: Project) {
    const week = weeks.find((w) => w.id === project.week_id)
    return week ? new Date() < new Date(week.submission_deadline) : false
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
        <button onClick={() => setShowEmailPrompt(true)} className="px-6 py-3 rounded-xl font-medium" style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}>
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

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>My Projects</h1>
          {isSubmissionOpen && !hasSubmittedThisWeek && activeWeek && (
            <button
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}
            >
              <Plus size={15} /> Add project
            </button>
          )}
        </div>

        {/* Submit CTA when no submission */}
        {isSubmissionOpen && !hasSubmittedThisWeek && activeWeek && (
          <div className="rounded-2xl p-7 mb-8 text-center" style={{ backgroundColor: '#E1F5EE', border: '0.5px solid #5DCAA5' }}>
            <p className="text-3xl mb-3">🌱</p>
            <h2 className="text-lg font-semibold mb-1" style={{ color: '#085041' }}>You haven't submitted yet this week</h2>
            <p className="text-sm mb-5" style={{ color: '#085041', opacity: 0.75 }}>Share what you're building — the cohort wants to see it</p>
            <button
              onClick={() => setShowAddProject(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm"
              style={{ backgroundColor: '#085041', color: '#E1F5EE' }}
            >
              Submit your project <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Week timeline dots */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {weeks.map((w) => {
              const hasProject = projects.some((p) => p.week_id === w.id)
              return (
                <div key={w.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={hasProject
                      ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }
                      : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '0.5px solid var(--border)' }}
                  >
                    {w.number}
                  </div>
                  <span className="text-xs" style={{ color: hasProject ? 'var(--accent-text)' : 'var(--text-muted)' }}>Wk {w.number}</span>
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

        {/* Tasks */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
          <h2 className="text-[22px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>My Tasks</h2>
          <form onSubmit={addTask} className="flex gap-2 mb-5">
            <input
              value={newTask} onChange={(e) => setNewTask(e.target.value)}
              placeholder="Add a task…"
              className="flex-1 text-sm px-4 py-2.5 rounded-xl focus:outline-none"
              style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
            />
            <button type="submit" className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
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
                <span className="text-sm flex-1" style={{ color: task.is_done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.is_done ? 'line-through' : 'none' }}>
                  {task.text}
                </span>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No tasks yet — add one above</p>
            )}
          </div>
        </div>
      </main>

      {showAddProject && activeWeek && (
        <AddProjectModal
          currentUser={currentUser}
          activeWeek={activeWeek}
          onClose={() => setShowAddProject(false)}
          onCreated={(project) => {
            setProjects((prev) => [{ ...project, vote_count: 0, user_voted: false }, ...prev])
          }}
        />
      )}

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
