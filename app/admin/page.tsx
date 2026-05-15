'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/client'
import { User, Week, Project } from '@/types'

interface MemberWithCount extends User {
  project_count: number
}

export default function AdminPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [members, setMembers] = useState<MemberWithCount[]>([])
  const [leaderboardWeek, setLeaderboardWeek] = useState('')
  const [leaderboard, setLeaderboard] = useState<Project[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [tab, setTab] = useState<'weeks' | 'members' | 'leaderboard'>('weeks')
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (!profile || !profile.is_admin) { router.push('/'); return }
      setCurrentUser(profile as User)

      const { data: weeksData } = await supabase.from('weeks').select('*').order('number')
      if (weeksData) setWeeks(weeksData as Week[])

      const { data: usersData } = await supabase.from('users').select('*').order('created_at')
      if (usersData) {
        const { data: projectsData } = await supabase.from('projects').select('user_id')
        const counts: Record<string, number> = {}
        projectsData?.forEach((p) => { counts[p.user_id] = (counts[p.user_id] || 0) + 1 })
        setMembers(usersData.map((u: User) => ({ ...u, project_count: counts[u.id] || 0 })) as MemberWithCount[])
      }
    }
    init()
  }, [])

  async function saveWeek(week: Week) {
    setSaving(week.id)
    await supabase.from('weeks').update({
      theme: week.theme,
      submission_deadline: week.submission_deadline,
      voting_open: week.voting_open,
      voting_close: week.voting_close,
      meeting_link: week.meeting_link,
      is_active: week.is_active,
    }).eq('id', week.id)
    setSaving(null)
  }

  async function removeMember(userId: string) {
    if (!confirm('Remove this member? Their projects will remain.')) return
    await supabase.from('users').update({ is_admin: false }).eq('id', userId)
    setMembers((prev) => prev.filter((m) => m.id !== userId))
  }

  async function loadLeaderboard(weekId: string) {
    setLeaderboardWeek(weekId)
    const { data } = await supabase
      .from('projects')
      .select('*, users(*), weeks(*)')
      .eq('week_id', weekId)
    if (data) {
      const ids = data.map((p: Project) => p.id)
      const { data: votes } = await supabase.from('votes').select('*').in('project_id', ids)
      const enriched = data.map((p: Project) => ({
        ...p, vote_count: votes?.filter((v) => v.project_id === p.id).length ?? 0,
      })).sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
      setLeaderboard(enriched as Project[])
    }
  }

  function updateWeek(id: string, field: keyof Week, value: string | boolean) {
    setWeeks((prev) => prev.map((w) => w.id === id ? { ...w, [field]: value } : w))
  }

  if (!currentUser) return null

  return (
    <>
      <Navbar user={currentUser} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Admin panel</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['weeks', 'members', 'leaderboard'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-[#3C3489] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-[#EEEDFE]'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Week schedule */}
        {tab === 'weeks' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Theme</th>
                  <th className="px-4 py-3 text-left">Deadline</th>
                  <th className="px-4 py-3 text-left">Voting open</th>
                  <th className="px-4 py-3 text-left">Voting close</th>
                  <th className="px-4 py-3 text-left">Meeting link</th>
                  <th className="px-4 py-3 text-left">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {weeks.map((week) => (
                  <tr key={week.id}>
                    <td className="px-4 py-3 font-medium text-gray-700">{week.number}</td>
                    <td className="px-4 py-3">
                      <input value={week.theme} onChange={(e) => updateWeek(week.id, 'theme', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[#AFA9EC]" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="datetime-local" value={week.submission_deadline.slice(0, 16)}
                        onChange={(e) => updateWeek(week.id, 'submission_deadline', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#AFA9EC]" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="datetime-local" value={week.voting_open.slice(0, 16)}
                        onChange={(e) => updateWeek(week.id, 'voting_open', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#AFA9EC]" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="datetime-local" value={week.voting_close.slice(0, 16)}
                        onChange={(e) => updateWeek(week.id, 'voting_close', e.target.value)}
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#AFA9EC]" />
                    </td>
                    <td className="px-4 py-3">
                      <input value={week.meeting_link || ''} onChange={(e) => updateWeek(week.id, 'meeting_link', e.target.value)}
                        placeholder="https://zoom.us/…"
                        className="px-2 py-1 rounded-lg border border-gray-200 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[#AFA9EC]" />
                    </td>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={week.is_active}
                        onChange={(e) => updateWeek(week.id, 'is_active', e.target.checked)}
                        className="rounded accent-[#3C3489]" />
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => saveWeek(week)} disabled={saving === week.id}
                        className="flex items-center gap-1 text-xs bg-[#EEEDFE] text-[#3C3489] px-2 py-1 rounded-lg hover:bg-[#3C3489] hover:text-white transition-colors disabled:opacity-50">
                        <Save size={10} /> {saving === week.id ? '…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Members */}
        {tab === 'members' && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Projects</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-medium text-gray-700">{member.display_name}</td>
                    <td className="px-4 py-3 text-gray-500">{member.email}</td>
                    <td className="px-4 py-3 text-gray-400">{new Date(member.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-gray-600">{member.project_count}</td>
                    <td className="px-4 py-3">
                      {member.id !== currentUser.id && (
                        <button onClick={() => removeMember(member.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Leaderboard */}
        {tab === 'leaderboard' && (
          <div>
            <select
              value={leaderboardWeek}
              onChange={(e) => loadLeaderboard(e.target.value)}
              className="mb-6 px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#AFA9EC]"
            >
              <option value="">Select a week…</option>
              {weeks.map((w) => (
                <option key={w.id} value={w.id}>{w.theme}</option>
              ))}
            </select>

            {leaderboard.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Cover</th>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Builder</th>
                      <th className="px-4 py-3 text-left">Votes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {leaderboard.map((p, i) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3 font-bold text-[#3C3489]">#{i + 1}</td>
                        <td className="px-4 py-3">
                          {p.cover_image_url ? (
                            <img src={p.cover_image_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#EEEDFE] flex items-center justify-center text-lg">🚀</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700">{p.title}</td>
                        <td className="px-4 py-3 text-gray-500">{p.users?.display_name}</td>
                        <td className="px-4 py-3 font-semibold text-[#3C3489]">{p.vote_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
