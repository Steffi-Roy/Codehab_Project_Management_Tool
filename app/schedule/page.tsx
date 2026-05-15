'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, List, BarChart2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import CalendarSidebar from '@/components/CalendarSidebar'
import EmailPrompt from '@/components/EmailPrompt'
import { createClient } from '@/lib/supabase/client'
import { User, Week, Task } from '@/types'

interface TaskWithWeek extends Task {
  due_week_id?: string
  due_date?: string
}

function isWithin48h(dateStr?: string): boolean {
  if (!dateStr) return false
  const diff = new Date(dateStr).getTime() - Date.now()
  return diff > 0 && diff < 48 * 60 * 60 * 1000
}

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date() && !isNaN(new Date(dateStr).getTime())
}

function barColor(task: TaskWithWeek): string {
  if (task.is_done) return '#5DCAA5'
  if (isOverdue(task.due_date)) return '#ED93B1'
  if (isWithin48h(task.due_date)) return '#EF9F27'
  return '#AFA9EC'
}

function barWidth(task: TaskWithWeek): number {
  if (task.is_done) return 100
  if (!task.due_date) return 20
  const start = new Date(task.created_at).getTime()
  const end = new Date(task.due_date).getTime()
  const now = Date.now()
  if (end <= start) return 50
  return Math.min(100, Math.max(5, ((now - start) / (end - start)) * 100))
}

export default function SchedulePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [tasks, setTasks] = useState<TaskWithWeek[]>([])
  const [view, setView] = useState<'list' | 'timeline'>('list')
  const [showEmailPrompt, setShowEmailPrompt] = useState(false)
  const [newTaskByWeek, setNewTaskByWeek] = useState<Record<string, string>>({})
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.is_anonymous) return

      const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (profile) setCurrentUser(profile as User)

      const [{ data: weeksData }, { data: tasksData }] = await Promise.all([
        supabase.from('weeks').select('*').order('number'),
        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at'),
      ])
      if (weeksData) setWeeks(weeksData as Week[])
      if (tasksData) setTasks(tasksData as TaskWithWeek[])
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !session.user.is_anonymous) {
        init()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function addTask(weekId: string, deadline: string) {
    if (!currentUser) { setShowEmailPrompt(true); return }
    const text = newTaskByWeek[weekId]?.trim()
    if (!text) return
    const { data } = await supabase.from('tasks').insert({
      user_id: currentUser.id, text, due_date: deadline, due_week_id: weekId,
    } as Record<string, unknown>).select().single()
    if (data) {
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

  function weekChipStyle(week: Week): React.CSSProperties {
    const now = new Date()
    if (week.is_active) return { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)', border: '0.5px solid var(--accent-border)' }
    if (now > new Date(week.voting_close)) return { backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)', border: '0.5px solid var(--border)' }
    return { backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px dashed var(--border)' }
  }

  const tasksByWeek = weeks.map((w) => ({
    week: w,
    tasks: tasks.filter((t) => (t as TaskWithWeek).due_week_id === w.id),
  }))

  const unassigned = tasks.filter((t) => !(t as TaskWithWeek).due_week_id)

  if (!currentUser) return (
    <>
      <Navbar user={null} onSignIn={() => setShowEmailPrompt(true)} />
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to see your schedule</h2>
        <button onClick={() => setShowEmailPrompt(true)} className="mt-4 px-6 py-3 rounded-xl font-medium" style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}>
          Sign in
        </button>
      </div>
      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )

  return (
    <>
      <Navbar user={currentUser} onSignIn={() => setShowEmailPrompt(true)} />

      <main className="max-w-7xl mx-auto px-4 py-8 flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[22px] font-semibold" style={{ color: 'var(--text-primary)' }}>My Schedule</h1>
            <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-surface)' }}>
              {(['list', 'timeline'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={view === v
                    ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                    : { color: 'var(--text-muted)' }
                  }
                >
                  {v === 'list' ? <List size={14} /> : <BarChart2 size={14} />}
                  {v === 'list' ? 'List' : 'Timeline'}
                </button>
              ))}
            </div>
          </div>

          {/* List view */}
          {view === 'list' && (
            <div className="space-y-6">
              {tasksByWeek.map(({ week, tasks: wTasks }) => (
                <div key={week.id} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={weekChipStyle(week)}>
                      Wk {week.number} · {week.theme.replace(/^Week \d+ · /, '')}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Deadline {new Date(week.submission_deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    {wTasks.map((task) => {
                      const due48 = isWithin48h(task.due_date)
                      const overdue = isOverdue(task.due_date) && !task.is_done
                      return (
                        <div key={task.id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleTask(task)} className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                            style={task.is_done ? { backgroundColor: '#5DCAA5', borderColor: '#5DCAA5' } : { borderColor: 'var(--border)' }}>
                            {task.is_done && <Check size={10} color="white" />}
                          </button>
                          <span className="text-sm flex-1" style={{
                            color: task.is_done ? 'var(--text-muted)' : overdue ? '#ED93B1' : due48 ? '#EF9F27' : 'var(--text-primary)',
                            textDecoration: task.is_done ? 'line-through' : 'none',
                          }}>{task.text}</span>
                          {due48 && !task.is_done && <span className="text-xs" style={{ color: '#EF9F27' }}>due soon</span>}
                          {overdue && <span className="text-xs" style={{ color: '#ED93B1' }}>overdue</span>}
                          <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                          </button>
                        </div>
                      )
                    })}
                    {wTasks.length === 0 && (
                      <div className="py-2 px-3 rounded-xl" style={{ border: '0.5px dashed var(--border)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks yet — add one below</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); addTask(week.id, week.submission_deadline) }} className="flex gap-2">
                    <input
                      value={newTaskByWeek[week.id] || ''}
                      onChange={(e) => setNewTaskByWeek((prev) => ({ ...prev, [week.id]: e.target.value }))}
                      placeholder={`Add a task for week ${week.number}…`}
                      className="flex-1 text-sm px-3 py-1.5 rounded-xl focus:outline-none"
                      style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    />
                    <button type="submit" className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                      <Plus size={14} />
                    </button>
                  </form>
                </div>
              ))}

              {/* Unassigned tasks */}
              {unassigned.length > 0 && (
                <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>General tasks</p>
                  <div className="space-y-2">
                    {unassigned.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 group">
                        <button onClick={() => toggleTask(task)} className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center"
                          style={task.is_done ? { backgroundColor: '#5DCAA5', borderColor: '#5DCAA5' } : { borderColor: 'var(--border)' }}>
                          {task.is_done && <Check size={10} color="white" />}
                        </button>
                        <span className="text-sm flex-1" style={{ color: 'var(--text-primary)', textDecoration: task.is_done ? 'line-through' : 'none' }}>{task.text}</span>
                        <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={12} style={{ color: 'var(--text-muted)' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline view */}
          {view === 'timeline' && (
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {tasks.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No tasks yet</p>
              )}
              <div className="space-y-4">
                {[...tasks].sort((a, b) => {
                  if (!a.due_date) return 1
                  if (!b.due_date) return -1
                  return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
                }).map((task) => {
                  const w = tasksByWeek.find((tw) => tw.tasks.some((t) => t.id === task.id))?.week
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      <span className="text-sm w-40 truncate flex-shrink-0" style={{ color: 'var(--text-secondary)' }} title={task.text}>{task.text}</span>
                      <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth(task)}%`, backgroundColor: barColor(task) }}
                        />
                      </div>
                      <span className="text-xs w-20 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {task.is_done ? 'Done' : w ? `Wk ${w.number}` : task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-6 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
                {[['#5DCAA5','Done'], ['#AFA9EC','In progress'], ['#EF9F27','Due soon'], ['#ED93B1','Overdue']].map(([color, label]) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <CalendarSidebar weeks={weeks} userId={currentUser?.id} onAuthRequired={() => setShowEmailPrompt(true)} />
      </main>

      {showEmailPrompt && <EmailPrompt onClose={() => setShowEmailPrompt(false)} />}
    </>
  )
}
