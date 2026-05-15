'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'

interface SubmitSuccessProps {
  projectTitle: string
  onDismiss: () => void
  redirectTo?: string
}

const EMOJI_SETS = [
  ['🎉', '✨', '🚀'],
  ['🌟', '🦄', '💫'],
  ['🔥', '⚡', '🎊'],
]

const PARTICLE_POSITIONS = [
  { top: '12%', left: '8%', delay: '0s', duration: '3s' },
  { top: '20%', left: '85%', delay: '0.4s', duration: '2.6s' },
  { top: '70%', left: '5%', delay: '0.8s', duration: '3.4s' },
  { top: '75%', left: '90%', delay: '0.2s', duration: '2.8s' },
  { top: '40%', left: '92%', delay: '1s', duration: '3.2s' },
  { top: '55%', left: '3%', delay: '0.6s', duration: '2.4s' },
  { top: '30%', left: '50%', delay: '1.2s', duration: '3.6s' },
  { top: '85%', left: '40%', delay: '0.3s', duration: '2.9s' },
  { top: '10%', left: '60%', delay: '0.7s', duration: '3.1s' },
]

export default function SubmitSuccess({ projectTitle, onDismiss, redirectTo = '/' }: SubmitSuccessProps) {
  const emojis = useMemo(() => EMOJI_SETS[Math.floor(Math.random() * EMOJI_SETS.length)], [])

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.3s ease' }}
    >
      {/* Floating particles */}
      {PARTICLE_POSITIONS.map((pos, i) => (
        <span
          key={i}
          className="absolute text-2xl pointer-events-none select-none"
          style={{
            top: pos.top,
            left: pos.left,
            animation: `float ${pos.duration} ease-in-out ${pos.delay} infinite`,
          }}
        >
          {emojis[i % emojis.length]}
        </span>
      ))}

      {/* Card */}
      <div
        className="relative rounded-3xl px-10 py-10 text-center max-w-sm w-full mx-4 flex flex-col items-center gap-5"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '0.5px solid var(--border)',
          animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        }}
      >
        <div className="text-5xl" style={{ animation: 'float 2.5s ease-in-out infinite' }}>
          {emojis[0]}
        </div>

        <div style={{ animation: 'fadeUp 0.5s ease 0.15s both' }}>
          <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Project submitted!</h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{projectTitle}</span> is live this week
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full" style={{ animation: 'fadeUp 0.5s ease 0.25s both' }}>
          <Link
            href="/"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors"
            style={{ backgroundColor: 'var(--accent-text)', color: 'var(--bg-card)' }}
          >
            See all projects
          </Link>
          <Link
            href="/my-project"
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }}
          >
            My projects
          </Link>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)', animation: 'fadeUp 0.5s ease 0.35s both' }}>
          Redirecting in 4 seconds…
        </p>
      </div>
    </div>
  )
}
