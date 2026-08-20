'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton(props: ButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  async function signOut() {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }
  return (
    <Button variant="outline" onClick={signOut} isLoading={loading} {...props}>
      Sign out
    </Button>
  )
}
