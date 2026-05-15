'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') ?? '/'
    const hasCode = params.has('code')

    // No code in URL — nothing to do
    if (!hasCode) {
      router.replace('/')
      return
    }

    // The SDK auto-exchanges the PKCE code on init via detectSessionInUrl.
    // INITIAL_SESSION may fire with null while the exchange is still in-flight,
    // so only redirect to error on SIGNED_OUT.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        subscription.unsubscribe()
        router.replace(next)
      } else if (event === 'SIGNED_OUT') {
        subscription.unsubscribe()
        router.replace('/?error=auth')
      }
    })

    // Fallback: if neither fires within 10 s, bail to error
    const timer = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/?error=auth')
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Signing you in…</p>
    </div>
  )
}
