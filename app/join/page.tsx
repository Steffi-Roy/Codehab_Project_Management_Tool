'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function JoinInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const validCode = process.env.NEXT_PUBLIC_COHORT_JOIN_CODE || 'COHORT2024'
    if (code === validCode) {
      localStorage.setItem('cohort_joined', 'true')
      router.push('/')
    } else {
      router.push('/?invalid_code=1')
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="text-center">
        <div className="text-4xl mb-4">⬡</div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>You've been invited to Codehab</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Verifying your invite…</p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Loading…</p></div>}>
      <JoinInner />
    </Suspense>
  )
}
