'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AvatarChip from './AvatarChip'
import { User } from '@/types'

interface NavbarProps {
  user: User | null
  onSignIn?: () => void
  onAvatarClick?: () => void
}

const NAV_LINKS = [
  { href: '/', label: 'Projects' },
  { href: '/collab', label: 'Collab' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/my-project', label: 'My project' },
]

type Theme = 'light' | 'dawn' | 'dark'
const THEMES: Theme[] = ['light', 'dawn', 'dark']
const THEME_LABELS: Record<Theme, string> = { light: 'Warm light', dawn: 'Soft dawn', dark: 'Dark maker' }

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const saved = (localStorage.getItem('codehab-theme') as Theme) || 'light'
    setTheme(saved)
  }, [])

  function cycle() {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
    setTheme(next)
    localStorage.setItem('codehab-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  return (
    <button
      onClick={cycle}
      title={THEME_LABELS[theme]}
      className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}

export default function Navbar({ user, onSignIn, onAvatarClick }: NavbarProps) {
  const pathname = usePathname()

  return (
    <nav
      className="sticky top-0 z-40 backdrop-blur"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-card) 92%, transparent)',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 font-semibold text-lg" style={{ color: 'var(--accent-text)' }}>
          Codehab
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
          </svg>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={
                pathname === link.href
                  ? { backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', letterSpacing: '0.01em' }
                  : { color: 'var(--text-secondary)', letterSpacing: '0.01em' }
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <button onClick={onAvatarClick} className="rounded-full">
              <AvatarChip name={user.display_name} color={user.avatar_color} size="md" />
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="text-sm px-3 py-1.5 rounded-full transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
