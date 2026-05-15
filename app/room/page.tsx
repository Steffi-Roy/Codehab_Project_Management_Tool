'use client'

import { useState, useEffect, useRef } from 'react'
import Navbar from '@/components/Navbar'
import AvatarChip from '@/components/AvatarChip'
import EmailPrompt from '@/components/EmailPrompt'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'

interface ChatMessage {
  id: string
  user: { display_name: string; avatar_color: string }
  text: string
  timestamp: Date
}

interface PresenceUser {
  display_name: string
  avatar_color: string
  user_id: string
}

export default function RoomPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [musicOn, setMusicOn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && !user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
        if (profile) setCurrentUser(profile as User)
      }
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
    if (currentUser === undefined) return

    const userPayload: PresenceUser = {
      display_name: currentUser?.display_name || 'Anonymous Builder',
      avatar_color: currentUser?.avatar_color || '#AFA9EC',
      user_id: currentUser?.id || 'anon',
    }

    const channel = supabase.channel('focus-room', { config: { presence: { key: userPayload.user_id } } })
    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users = Object.values(state).flat()
        setPresentUsers(users)
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, { ...payload, timestamp: new Date(payload.timestamp) }])
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userPayload)
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [currentUser])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !channelRef.current) return

    const msg = {
      id: Date.now().toString(),
      user: { display_name: currentUser?.display_name || 'Anonymous', avatar_color: currentUser?.avatar_color || '#AFA9EC' },
      text: newMessage.trim(),
      timestamp: new Date().toISOString(),
    }

    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: msg })
    setMessages((prev) => [...prev, { ...msg, timestamp: new Date(msg.timestamp) }])
    setNewMessage('')
  }

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-5xl mx-auto px-4 py-8 flex gap-6">
        {/* Ambient area */}
        <div className="flex-1">
          {/* Lofi background */}
          <div className="relative h-64 bg-gradient-to-br from-[#EEEDFE] via-[#FBEAF0] to-[#E1F5EE] rounded-2xl overflow-hidden mb-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-3 animate-pulse">🌙</div>
              <p className="text-[#3C3489] font-medium">Focus room</p>
              <p className="text-sm text-[#AFA9EC] mt-1">{presentUsers.length} builder{presentUsers.length !== 1 ? 's' : ''} here</p>
            </div>

            {/* Floating shapes */}
            <div className="absolute top-6 left-8 w-16 h-16 bg-[#AFA9EC]/20 rounded-full" />
            <div className="absolute bottom-8 right-12 w-10 h-10 bg-[#5DCAA5]/20 rounded-full" />
            <div className="absolute top-12 right-20 w-8 h-8 bg-[#EF9F27]/20 rounded-full" />
          </div>

          {/* Music toggle */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <p className="font-medium text-gray-700 text-sm">Lofi music</p>
                  <p className="text-xs text-gray-400">Chill beats to focus to</p>
                </div>
              </div>
              <button
                onClick={() => setMusicOn((v) => !v)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${musicOn ? 'bg-[#3C3489] text-white' : 'bg-[#EEEDFE] text-[#3C3489]'}`}
              >
                {musicOn ? 'Playing ▶' : 'Play'}
              </button>
            </div>
            {musicOn && (
              <iframe
                className="w-full mt-3 rounded-xl"
                height="80"
                src="https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&controls=0"
                allow="autoplay"
              />
            )}
          </div>

          {/* Chat */}
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ height: '400px' }}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-700 text-sm">Room chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-gray-400 text-center mt-8">No messages yet. Say hi! 👋</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-2">
                  <AvatarChip name={msg.user.display_name} color={msg.user.avatar_color} size="sm" />
                  <div>
                    <span className="text-xs font-medium text-gray-700">{msg.user.display_name}</span>
                    <p className="text-sm text-gray-600">{msg.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Say something…"
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AFA9EC]"
              />
              <button type="submit" className="px-4 py-2 bg-[#3C3489] text-white rounded-xl text-sm hover:bg-[#AFA9EC] transition-colors">
                Send
              </button>
            </form>
          </div>
        </div>

        {/* People in room */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              In the room ({presentUsers.length})
            </h3>
            <div className="space-y-3">
              {presentUsers.map((u, i) => (
                <div key={i} className="flex items-center gap-2">
                  <AvatarChip name={u.display_name} color={u.avatar_color} size="sm" />
                  <span className="text-sm text-gray-700">{u.display_name}</span>
                  <span className="w-1.5 h-1.5 bg-[#5DCAA5] rounded-full ml-auto" />
                </div>
              ))}
              {presentUsers.length === 0 && <p className="text-xs text-gray-400">No one here yet</p>}
            </div>
          </div>
        </div>
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
