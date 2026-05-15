'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, List, BarChart2, ChevronDown, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CalendarSidebar from '@/components/CalendarSidebar'
import EmailPrompt from '@/components/EmailPrompt'
import { createClient } from '@/lib/supabase/client'
import { User, Week, Task } from '@/types'

interface TaskWithWeek extends Task {
  due_week_id?: string
  due_date?: string
}

function deadlineCountdown(dateStr: string): { label: string; color: string; bg: string } {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff < 0) return { label: 'Past', color: 'var(--text-muted)', bg: 'var(--bg-surface)' }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 3) return { label: `${days}d left`, color: '#085041', bg: '#E1F5EE' }
  if (days >= 1) return { label: `${days}d left`, color: '#633806', bg: '#FAEEDA' }
  if (hours > 0) return { label: `${hours}h left`, color: '#85212A', bg: '#FDE8EC' }
  return { label: 'Due soon', color: '#85212A', bg: '#FDE8EC' }
}

function isWithin48h(dateStr?: string) {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 172800000
}

function barColor(task: TaskWithWeek) {
  if (task.is_done) return '#5DCAA5'
  if (isWithin48h(task.due_date)) return '#EF9F27'
  return '#AFA9EC'
}

function barWidth(task: TaskWithWeek) {
  if (task.is_done) return 100
  if (!task.due_date) return 15
  const start = new Date(task.created_at).getTime()
  const end = new Date(task.due_date).getTime()
  const now = Date.now()
  if (end <= start) return 40
  return Math.min(98, Math.max(6, ((now - start) / (end - start)) * 100))
}

function weekStatus(week: Week): 'past' | 'active' | 'upcoming' {
  const now = new Date()
  if (now > new Date(week.voting_close)) return 'past'
  if (week.is_active) return 'active'
  return 'upcoming'
}

export default function SchedulePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [tasks, setTasks] = useState<TaskWithWeek[]>([])
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [newTaskByWeek, setNewTaskByWeek] = useState<Record<string, string>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && !session.user.is_anonymous) {
        const { data: profile } = await supabase.from('users').select('*').eq('id', session.user.id).single()
        if (profile) {
          setCurrentUser(profile as User)
          const { data: tasksData } = await supabase.from('tasks').select('*').eq('user_id', session.user.id).order('created_at')
          if (tasksData) setTasks(tasksData as TaskWithWeek[])
        }
      } else {
        setCurrentUser(null)
      }
    })

    async function loadData() {
      const { data } = await supabase.from('weeks').select('*').order('number')
      if (data) {
        setWeeks(data as Week[])
        // Auto-collapse past weeks
        const init: Record<string, boolean> = {}
        data.forEach((w: Week) => {
          if (weekStatus(w) === 'past') init[w.id] = true
        })
        setCollapsed(init)
      }
    }
    loadData()

    return () => subscription.unsubscribe()
  }, [])

  async function addTask(weekId: string, deadline: string) {
    if (!currentUser) { setShowEmailPrompt(true); return }
    const text = newTaskByWeek[weekId]?.trim()
    if (!text) return
    const { data, error } = await supabase.from('tasks').insert({
      user_id: currentUser.id,
      text,
      due_date: deadline,
      due_week_id: weekId,
    } as Record<string, unknown>).select().single()
    if (!error && data) {
      setTasks((prev) => [...prev, data as TaskWithWeek])
      setNewTaskByWeek((prev) => ({ ...prev, [weekId]: '' }))
    }
  }

  async function toggleTask(task: TaskWithWeek) {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const tasksByWeek = weeks.map((w) => ({
    week: w,
    tasks: tasks.filter((t) => t.due_week_id === w.id),
  }))

  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.is_done).length

  if (!currentUser) return (
    <>
      <Navbar user={null} onSignIn={() => setShowEmailPrompt(true)} />
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-2xl" style={{ backgroundColor: 'var(--accent-bg)' }}>📋</div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Your schedule lives here</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Track tasks per week and stay on top of deadlines.</p>
        <button onClick={() => setShowEmailPrompt(true)} className="px-6 py-2.5 rounded-xl font-medium text-sm" style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}>
          Sign in to get started
        </button>
      </div>
      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>My Schedule</h1>
              {totalTasks > 0 && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {doneTasks}/{totalTasks} done
                </p>
              )}
            </div>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
              {(['list', 'timeline'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={view === v
                    ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    : { color: 'var(--text-muted)' }}
                >
                  {v === 'list' ? <List size={13} /> : <BarChart2 size={13} />}
                  {v === 'list' ? 'List' : 'Timeline'}
                </button>
              ))}
            </div>
          </div>

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <div className="space-y-3">
              {tasksByWeek.map(({ week, tasks: wTasks }) => {
                const status = weekStatus(week)
                const done = wTasks.filter((t) => t.is_done).length
                const total = wTasks.length
                const countdown = deadlineCountdown(week.submission_deadline)
                const isCollapsed = collapsed[week.id]

                return (
                  <div
                    key={week.id}
                    className="rounded-2xl overflow-hidden transition-opacity"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: status === 'active'
                        ? '1px solid var(--accent-border)'
                        : '0.5px solid var(--border)',
                      opacity: status === 'past' ? 0.6 : 1,
                    }}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setCollapsed((prev) => ({ ...prev, [week.id]: !prev[week.id] }))}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                      style={status === 'active' ? { backgroundColor: 'var(--accent-bg)' } : {}}
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={status === 'active'
                            ? { backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }
                            : { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}
                        >
                          Wk {week.number} · {week.theme.replace(/^Week \d+ · /, '')}
                        </span>
                        {status === 'active' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#5DCAA5', color: '#fff' }}>Active</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {total > 0 && (
                          <span className="text-xs font-medium" style={{ color: done === total ? '#5DCAA5' : 'var(--text-muted)' }}>
                            {done}/{total} done
                          </span>
                        )}
                        {status !== 'past' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: countdown.color, backgroundColor: countdown.bg }}>
                            {countdown.label}
                          </span>
                        )}
                        {status === 'past' && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(week.submission_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Progress bar */}
                    {total > 0 && (
                      <div className="h-0.5 w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div
                          className="h-full transition-all"
                          style={{ width: `${(done / total) * 100}%`, backgroundColor: done === total ? '#5DCAA5' : 'var(--accent-text)' }}
                        />
                      </div>
                    )}

                    {/* Collapsible body */}
                    {!isCollapsed && (
                      <div className="px-5 pb-4 pt-3">
                        <div className="space-y-1.5 mb-3">
                          {wTasks.map((task) => {
                            const soon = isWithin48h(task.due_date) && !task.is_done
                            return (
                              <div key={task.id} className="flex items-center gap-2.5 group py-0.5">
                                <button
                                  onClick={() => toggleTask(task)}
                                  className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                                  style={task.is_done
                                    ? { backgroundColor: '#5DCAA5', border: '1.5px solid #5DCAA5' }
                                    : { border: '1.5px solid var(--border)', backgroundColor: 'transparent' }}
                                >
                                  {task.is_done && <Check size={9} color="white" strokeWidth={3} />}
                                </button>
                                <span
                                  className="text-sm flex-1"
                                  style={{
                                    color: task.is_done ? 'var(--text-muted)' : soon ? '#EF9F27' : 'var(--text-primary)',
                                    textDecoration: task.is_done ? 'line-through' : 'none',
                                  }}
                                >
                                  {task.text}
                                </span>
                                {soon && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FAEEDA', color: '#633806' }}>due soon</span>}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                                >
                                  <Trash2 size={11} style={{ color: 'var(--text-muted)' }} />
                                </button>
                              </div>
                            )
                          })}

                          {wTasks.length === 0 && (
                            <p className="text-xs py-1" style={{ color: 'var(--text-muted)' }}>No tasks yet — add one below</p>
                          )}
                        </div>

                        <form
                          onSubmit={(e) => { e.preventDefault(); addTask(week.id, week.submission_deadline) }}
                          className="flex gap-2"
                        >
                          <input
                            value={newTaskByWeek[week.id] || ''}
                            onChange={(e) => setNewTaskByWeek((prev) => ({ ...prev, [week.id]: e.target.value }))}
                            placeholder={`Add a task for week ${week.number}…`}
                            className="flex-1 text-xs px-3 py-2 rounded-xl focus:outline-none transition-colors"
                            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
                            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
                          >
                            <Plus size={12} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── TIMELINE VIEW ── */}
          {view === 'timeline' && (
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
              {tasks.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No tasks yet — add some in List view</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {tasksByWeek.filter(({ tasks: wt }) => wt.length > 0).map(({ week, tasks: wTasks }) => (
                      <div key={week.id}>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                          Wk {week.number} · {week.theme.replace(/^Week \d+ · /, '')}
                        </p>
                        <div className="space-y-2 pl-2">
                          {wTasks.map((task) => (
                            <div key={task.id} className="flex items-center gap-3">
                              <span className="text-xs w-36 truncate flex-shrink-0" style={{ color: task.is_done ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: task.is_done ? 'line-through' : 'none' }} title={task.text}>
                                {task.text}
                              </span>
                              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{ width: `${barWidth(task)}%`, backgroundColor: barColor(task) }}
                                />
                              </div>
                              <span className="text-xs w-16 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                {task.is_done ? '✓ done' : isWithin48h(task.due_date) ? 'due soon' : `Wk ${week.number}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 mt-5 pt-4 flex-wrap" style={{ borderTop: '0.5px solid var(--border)' }}>
                    {[['#5DCAA5', 'Done'], ['#AFA9EC', 'In progress'], ['#EF9F27', 'Due soon']].map(([color, label]) => (
                      <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        {label}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <CalendarSidebar weeks={weeks} userId={currentUser?.id} onAuthRequired={() => setShowEmailPrompt(true)} />
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
