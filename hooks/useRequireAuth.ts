import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRequireAuth() {
  const [showPrompt, setShowPrompt] = useState(false)
  const supabase = createClient()

  async function requireAuth(action: () => void | Promise<void>) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.email) {
      setShowPrompt(true)
      return false
    }
    await action()
    return true
  }

  return { requireAuth, showPrompt, setShowPrompt }
}
