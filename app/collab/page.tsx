'use client'

import { useState, useEffect } from 'react'
import { X, Send, GitBranch } from 'lucide-react'
import Navbar from '@/components/Navbar'
import EmailPrompt from '@/components/EmailPrompt'
import AvatarChip from '@/components/AvatarChip'
import TagInput from '@/components/TagInput'
import { createClient } from '@/lib/supabase/client'
import { User, CollabListing, ListingReply } from '@/types'

const SKILL_SUGGESTIONS = ['Designer', 'Developer', 'Marketer', 'No-code', 'AI/ML', 'Product', 'Copywriter', 'Data', 'DevOps']
const FILTERS = ['All', 'Designer', 'Developer', 'Marketer', 'No-code', 'AI/ML', 'Product']

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function ListingCard({
  listing,
  currentUser,
  onClose,
  onAuthRequired,
}: {
  listing: CollabListing
  currentUser: User | null
  onClose: (id: string) => void
  onAuthRequired: () => void
}) {
  const [replies, setReplies] = useState<ListingReply[]>(listing.listing_replies || [])
  const [newReply, setNewReply] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`replies-${listing.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listing_replies', filter: `listing_id=eq.${listing.id}` }, async (payload) => {
        const { data } = await supabase.from('listing_replies').select('*, users(*)').eq('id', payload.new.id).single()
        if (data) setReplies((prev) => [...prev, data as ListingReply])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [listing.id])

  async function sendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) { onAuthRequired(); return }
    if (!newReply.trim()) return
    await supabase.from('listing_replies').insert({ listing_id: listing.id, user_id: currentUser.id, text: newReply.trim() })
    setNewReply('')
  }

  const isOwner = currentUser?.id === listing.user_id

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {listing.users && (
            <AvatarChip name={listing.users.display_name} color={listing.users.avatar_color} size="sm" />
          )}
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{listing.users?.display_name}</span>
            {listing.users?.handle && <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>@{listing.users.handle}</span>}
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(listing.created_at)}</span>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => onClose(listing.id)}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface)' }}
          >
            Close listing
          </button>
        )}
      </div>

      <h3 className="text-base mb-2" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{listing.title}</h3>
      <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{listing.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {listing.skills_offered.map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC' }}>
            {s}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {listing.looking_for.map((s) => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E1F5EE', color: '#085041', border: '0.5px solid #5DCAA5' }}>
            Looking for: {s}
          </span>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {listing.github_url && (
          <a href={listing.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            <GitBranch size={12} /> GitHub
          </a>
        )}
        {listing.linkedin_url && (
          <a href={listing.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
            LinkedIn
          </a>
        )}
      </div>

      <div className="pt-4" style={{ borderTop: '0.5px solid var(--border)' }}>
        <div className="space-y-3 mb-3">
          {replies.map((r) => (
            <div key={r.id} className="flex gap-2">
              {r.users && <AvatarChip name={r.users.display_name} color={r.users.avatar_color} size="sm" />}
              <div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{r.users?.display_name}</span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(r.created_at)}</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{r.text}</p>
              </div>
            </div>
          ))}
          {replies.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No replies yet</p>}
        </div>
        <form onSubmit={sendReply} className="flex gap-2">
          <input
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder="Reply…"
            className="flex-1 text-sm px-3 py-2 rounded-xl focus:outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
          />
          <button type="submit" className="px-3 py-2 rounded-xl" style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}>
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  )
}

export default function CollabPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [listings, setListings] = useState<CollabListing[]>([])
  const [filter, setFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [hasActiveListing, setHasActiveListing] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formSkillsOffered, setFormSkillsOffered] = useState<string[]>([])
  const [formLookingFor, setFormLookingFor] = useState<string[]>([])
  const [formGithub, setFormGithub] = useState('')
  const [formLinkedin, setFormLinkedin] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
        if (profile) setCurrentUser(profile as User)
      }

      loadListings()
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        if (profile) setCurrentUser(profile as User)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (currentUser) {
      const active = listings.find((l) => l.user_id === currentUser.id && l.is_active)
      setHasActiveListing(!!active)
    }
  }, [listings, currentUser])

  async function loadListings() {
    const { data } = await supabase
      .from('collab_listings')
      .select('*, users(*), listing_replies(*, users(*))')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) setListings(data as CollabListing[])
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUser) return
    setSubmitting(true)
    const { data } = await supabase.from('collab_listings').insert({
      user_id: currentUser.id,
      title: formTitle,
      description: formDesc,
      skills_offered: formSkillsOffered,
      looking_for: formLookingFor,
      github_url: formGithub || null,
      linkedin_url: formLinkedin || null,
    }).select('*, users(*), listing_replies(*, users(*))').single()

    if (data) {
      setListings((prev) => [data as CollabListing, ...prev])
      setShowForm(false)
      setFormTitle(''); setFormDesc(''); setFormSkillsOffered([]); setFormLookingFor([])
      setFormGithub(''); setFormLinkedin('')
    }
    setSubmitting(false)
  }

  async function closeListing(id: string) {
    await supabase.from('collab_listings').update({ is_active: false }).eq('id', id)
    setListings((prev) => prev.filter((l) => l.id !== id))
  }

  const filtered = listings.filter((l) =>
    filter === 'All' || l.looking_for.includes(filter)
  )

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>Collab board</h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Find people to build with · {listings.length} active listing{listings.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => { if (hasActiveListing) return; if (!currentUser) { setShowEmailPrompt(true); return } setShowForm((v) => !v) }}
            disabled={hasActiveListing}
            title={hasActiveListing ? 'You already have an active listing' : undefined}
            className="px-5 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#085041', color: '#E1F5EE' }}
          >
            Post listing
          </button>
        </div>

        {/* New listing form */}
        {showForm && (
          <form onSubmit={handlePost} className="rounded-2xl p-5 mb-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent-border)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-medium" style={{ color: 'var(--text-primary)' }}>New listing</h2>
              <button type="button" onClick={() => setShowForm(false)}><X size={16} style={{ color: 'var(--text-muted)' }} /></button>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>What are you building?</label>
              <input
                value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required
                placeholder="Project or idea title"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Describe your idea, stage, and what you need</label>
              <textarea
                value={formDesc} onChange={(e) => setFormDesc(e.target.value)} required rows={3}
                placeholder="What you're building, what stage you're at, what you need…"
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
              />
            </div>

            <TagInput
              label="Skills you bring"
              suggestions={SKILL_SUGGESTIONS}
              value={formSkillsOffered}
              onChange={setFormSkillsOffered}
              colour="purple"
              placeholder="Add a skill… press Enter"
            />

            <TagInput
              label="Looking for"
              suggestions={SKILL_SUGGESTIONS}
              value={formLookingFor}
              onChange={setFormLookingFor}
              colour="teal"
              placeholder="Add a role… press Enter"
            />

            <div className="grid grid-cols-2 gap-3">
              <input value={formGithub} onChange={(e) => setFormGithub(e.target.value)} placeholder="GitHub URL (optional)"
                className="px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }} />
              <input value={formLinkedin} onChange={(e) => setFormLinkedin(e.target.value)} placeholder="LinkedIn URL (optional)"
                className="px-3 py-2 rounded-xl text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }} />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50" style={{ backgroundColor: '#085041', color: '#E1F5EE' }}>
                {submitting ? 'Posting…' : 'Post listing'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-full text-sm" style={{ color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={filter === f
                ? { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)' }
                : { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }
              }>
              {f}
            </button>
          ))}
        </div>

        {/* Listings */}
        <div className="space-y-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              currentUser={currentUser}
              onClose={closeListing}
              onAuthRequired={() => setShowEmailPrompt(true)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
              <p className="text-4xl mb-3">🤝</p>
              <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>No listings yet</p>
              <p className="text-sm">Looking for a collaborator? Post a listing — it takes 2 minutes</p>
              {!hasActiveListing && (
                <button
                  onClick={() => { if (!currentUser) { setShowEmailPrompt(true); return } setShowForm(true) }}
                  className="mt-4 px-5 py-2 rounded-full text-sm font-medium"
                  style={{ backgroundColor: '#085041', color: '#E1F5EE' }}
                >
                  Post a listing
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
