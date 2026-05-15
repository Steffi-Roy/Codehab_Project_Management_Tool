'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Sparkles, RefreshCw, Check, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EmailPrompt from '@/components/EmailPrompt'
import ProjectCard from '@/components/ProjectCard'
import TagInput from '@/components/TagInput'
import { createClient } from '@/lib/supabase/client'
import { User, Week, Project } from '@/types'

const TAG_SUGGESTIONS = ['Tool', 'Community', 'Design', 'AI', 'Mobile', 'API', 'Open source', 'SaaS']

export default function SubmitPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [tags, setTags] = useState<string[]>(['Tool'])
  const [collabOpen, setCollabOpen] = useState(false)
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [coverTab, setCoverTab] = useState<'upload' | 'ai'>('upload')
  const [polishing, setPolishing] = useState(false)
  const [polishedText, setPolishedText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      if (weeksData) setWeeks(weeksData as Week[])
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  const activeWeek = weeks.find((w) => w.is_active) ?? weeks[weeks.length - 1]

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    if (file.size > 4 * 1024 * 1024) { setError('File must be under 4MB'); return }

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
    } catch {
      setError('Failed to generate image')
    }
    setGenerating(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) { setShowEmailPrompt(true); return }
    if (!activeWeek) { setError('No active week found'); return }
    if (!coverImageUrl) { setError('Please add a cover image'); return }
    if (!githubUrl.includes('github.com')) { setError('Please enter a valid GitHub URL'); return }

    setSubmitting(true)
    setError('')

    const tag = tags[0] || 'Other'
    const { error: insertError } = await supabase.from('projects').insert({
      user_id: currentUser.id,
      week_id: activeWeek.id,
      title, description, cover_image_url: coverImageUrl,
      github_url: githubUrl, video_url: videoUrl || null,
      tag, collab_open: collabOpen,
    }).select().single()

    if (insertError) { setError(insertError.message); setSubmitting(false); return }
    router.push('/')
  }

  const previewProject: Project = {
    id: 'preview', user_id: currentUser?.id || '', week_id: activeWeek?.id || '',
    title: title || 'Your project title', description: description || 'Your project description will appear here.',
    cover_image_url: coverImageUrl || null, github_url: githubUrl || 'https://github.com',
    video_url: videoUrl || null, tag: (tags[0] || 'Tool') as 'Tool' | 'Design' | 'Community' | 'Other', collab_open: collabOpen, created_at: new Date().toISOString(),
    users: currentUser ?? undefined, weeks: activeWeek ?? undefined, vote_count: 0, user_voted: false,
  }

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-[22px] font-semibold mb-8" style={{ color: 'var(--text-primary)' }}>Submit your project</h1>

        <div className="flex gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title *</label>
              <input
                value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="My awesome project"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Description *</label>
                <span className="text-xs" style={{ color: description.trim().split(/\s+/).filter(Boolean).length > 190 ? '#ED93B1' : 'var(--text-muted)' }}>
                  {description.trim().split(/\s+/).filter(Boolean).length} / 200 words
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) => {
                  const words = e.target.value.trim().split(/\s+/).filter(Boolean)
                  if (words.length <= 200) setDescription(e.target.value)
                  else setDescription(words.slice(0, 200).join(' '))
                }}
                required
                rows={4} placeholder="What did you build this week?"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
              <button type="button" onClick={handlePolish} disabled={polishing || !description}
                className="mt-2 flex items-center gap-2 text-sm disabled:opacity-50 transition-colors"
                style={{ color: 'var(--accent-text)' }}>
                <Sparkles size={14} /> {polishing ? 'Polishing…' : 'Polish with AI'}
              </button>

              {polishedText && (
                <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: '#E1F5EE', border: '0.5px solid #5DCAA5' }}>
                  <p className="text-sm mb-3" style={{ color: '#085041' }}>{polishedText}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setDescription(polishedText); setPolishedText('') }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#085041', color: '#E1F5EE' }}>
                      <Check size={12} /> Use this
                    </button>
                    <button type="button" onClick={() => setPolishedText('')}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', color: '#085041', border: '0.5px solid #5DCAA5' }}>
                      <X size={12} /> Discard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cover image */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cover image *</label>
              <div className="flex gap-2 mb-3">
                {(['upload', 'ai'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setCoverTab(t)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    style={coverTab === t
                      ? { backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }
                      : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }
                    }>
                    {t === 'upload' ? '⬆ Upload' : '✦ Generate with AI'}
                  </button>
                ))}
              </div>

              {coverTab === 'upload' ? (
                <div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.backgroundColor = 'var(--accent-bg)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {coverImageUrl ? (
                      <img src={coverImageUrl} alt="Cover" className="h-32 mx-auto rounded-lg object-cover" />
                    ) : (
                      <>
                        <Upload size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Click or drag PNG/JPG/GIF (max 4MB)</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </div>
              ) : (
                <div>
                  {coverImageUrl && (
                    <img src={coverImageUrl} alt="Generated cover" className="w-full h-40 object-cover rounded-xl mb-3" />
                  )}
                  <button type="button" onClick={handleGenerateImage} disabled={generating || !title}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                    <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                    {generating ? 'Generating…' : coverImageUrl ? 'Regenerate' : 'Generate cover art'}
                  </button>
                </div>
              )}
            </div>

            {/* GitHub URL */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>GitHub URL *</label>
              <input
                value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} required
                placeholder="https://github.com/username/repo"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Video URL (optional)</label>
              <input
                value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
            </div>

            {/* Tag */}
            <TagInput
              label="Tag"
              suggestions={TAG_SUGGESTIONS}
              value={tags}
              onChange={setTags}
              max={3}
              placeholder="Select or type a tag…"
              colour="purple"
            />

            {/* Collab toggle */}
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCollabOpen((v) => !v)}
                className="w-10 h-6 rounded-full transition-colors relative"
                style={{ backgroundColor: collabOpen ? '#5DCAA5' : 'var(--bg-surface)', border: '0.5px solid var(--border)' }}>
                <span
                  className="absolute top-1 w-4 h-4 rounded-full shadow transition-transform"
                  style={{ backgroundColor: 'var(--bg-card)', transform: collabOpen ? 'translateX(20px)' : 'translateX(4px)' }}
                />
              </button>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Open to collaborators</span>
            </div>

            {error && <p className="text-sm" style={{ color: '#ED93B1' }}>{error}</p>}

            <div className="flex gap-3">
              <button type="submit" disabled={submitting}
                className="flex-1 py-3 rounded-xl font-medium transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}>
                {submitting ? 'Submitting…' : 'Submit project'}
              </button>
            </div>
          </form>

          {/* Live preview */}
          <div className="w-64 flex-shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Preview</p>
            <ProjectCard project={previewProject} />
          </div>
        </div>
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} onSuccess={() => setShowEmailPrompt(false)} />}
    </>
  )
}
