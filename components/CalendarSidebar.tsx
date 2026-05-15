'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Check } from 'lucide-react'
import { Week, Task } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatDeadline } from '@/lib/utils'

interface CalendarSidebarProps {
  weeks: Week[]
  userId?: string
  onAuthRequired?: () => void
}

export default function CalendarSidebar({ weeks, userId, onAuthRequired }: CalendarSidebarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [taskError, setTaskError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    async function loadTasks() {
      const { data } = await supabase.from('tasks').select('*').eq('user_id', userId).order('created_at')
      if (data) setTasks(data as Task[])
    }
    loadTasks()
  }, [userId])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function isVotingDay(day: number) {
    return weeks.some((w) => {
      const open = new Date(w.voting_open)
      const close = new Date(w.voting_close)
      const d = new Date(year, month, day)
      return d >= open && d <= close
    })
  }

  function isStandupDay(day: number) {
    return weeks.some((w) => {
      const deadline = new Date(w.submission_deadline)
      return deadline.getFullYear() === year && deadline.getMonth() === month && deadline.getDate() === day
    })
  }

  const activeWeek = weeks.find((w) => w.is_active)

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) { onAuthRequired?.(); return }
    if (!newTask.trim()) return
    setTaskError('')
    const { data, error } = await supabase.from('tasks').insert({ user_id: userId, text: newTask.trim() }).select().single()
    if (error) { setTaskError(error.message); return }
    if (data) { setTasks((prev) => [...prev, data as Task]); setNewTask('') }
  }

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ is_done: !task.is_done }).eq('id', task.id)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_done: !t.is_done } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa']

  return (
    <aside className="w-64 flex-shrink-0 space-y-4">
      {/* Calendar */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{MONTH_NAMES[month]} {year}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs py-1" style={{ color: 'var(--text-muted)' }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
            const voting = isVotingDay(day)
            const standup = isStandupDay(day)
            let style: React.CSSProperties = { color: 'var(--text-secondary)' }
            if (isToday) {
              style = { backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)', fontWeight: 600 }
            } else if (standup) {
              style = { backgroundColor: '#E1F5EE', color: '#085041' }
            } else if (voting) {
              style = { backgroundColor: '#FAEEDA', color: '#633806' }
            }
            return (
              <div key={day} className="text-center text-xs py-1 rounded-md font-medium" style={style}>
                {day}
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#5DCAA5' }} /> Standup</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#EF9F27' }} /> Voting</span>
        </div>
      </div>

      {/* This week events */}
      {activeWeek && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>This Week</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Deadline</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDeadline(activeWeek.submission_deadline)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Voting opens</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDeadline(activeWeek.voting_open)}</span>
            </div>
            {activeWeek.meeting_link && (
              <a href={activeWeek.meeting_link} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors"
                 style={{ backgroundColor: '#E1F5EE', color: '#085041' }}>
                <span className="font-medium text-sm">Join Zoom</span>
                <span className="text-xs">↗</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>My Tasks</h3>
        {taskError && <p className="text-xs mb-2" style={{ color: '#ED93B1' }}>{taskError}</p>}
        <form onSubmit={addTask} className="flex gap-1 mb-3">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add task…"
            className="flex-1 text-xs px-2 py-1.5 rounded-lg focus:outline-none"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
          />
          <button type="submit" className="p-1.5 rounded-lg transition-colors" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
            <Plus size={12} />
          </button>
        </form>
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button
                onClick={() => toggleTask(task)}
                className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors"
                style={task.is_done ? { backgroundColor: '#5DCAA5', borderColor: '#5DCAA5' } : { borderColor: 'var(--border)' }}
              >
                {task.is_done && <Check size={10} color="white" />}
              </button>
              <span className="text-xs flex-1" style={{
                color: task.is_done ? 'var(--text-muted)' : 'var(--text-secondary)',
                textDecoration: task.is_done ? 'line-through' : 'none',
              }}>{task.text}</span>
              <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={10} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks yet</p>}
        </div>
      </div>
    </aside>
  )
}
