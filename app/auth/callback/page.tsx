'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next') ?? '/'

    // The SDK auto-exchanges the PKCE code on init via detectSessionInUrl.
    // Just wait for the session to land.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        subscription.unsubscribe()
        router.replace(next)
      } else if (event === 'INITIAL_SESSION' && !session) {
        subscription.unsubscribe()
        router.replace('/?error=auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Signing you in…</p>
    </div>
  )
}
