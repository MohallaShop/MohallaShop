'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { classifyError } from '@/lib/api/errors'
import { updateProfile } from '@/lib/api/profile'
import { getBrowserToken } from '@/lib/api/browser'
import type { ProfileOut } from '@/lib/api/types'

export function ProfileForm({ profile }: { profile: ProfileOut }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const token = await getBrowserToken()
      if (!token) throw new Error('Session expired. Please sign in again.')
      await updateProfile(token, {
        display_name: displayName.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      })
      setSaved(true)
    } catch (err) {
      setError(classifyError(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <div>
        <label htmlFor="display_name" className="text-content block text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={120}
          className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 outline-none"
          placeholder="e.g. Aarav Sharma"
          autoComplete="name"
        />
      </div>
      <div>
        <label htmlFor="avatar_url" className="text-content block text-sm font-medium">
          Avatar URL <span className="text-muted">(optional)</span>
        </label>
        <input
          id="avatar_url"
          name="avatar_url"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="border-border bg-background text-content focus:border-brand-500 mt-1 block w-full rounded-xl border px-3 py-2.5 outline-none"
          placeholder="https://…"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" isLoading={saving}>
          Save changes
        </Button>
        {saved ? <span className="text-success text-sm">Saved</span> : null}
        {error ? (
          <span role="alert" className="text-danger text-sm">
            {error}
          </span>
        ) : null}
      </div>
      <p className="text-muted text-xs">
        Phone: {profile.phone ?? '—'} · Email: {profile.email ?? '—'}
      </p>
    </form>
  )
}
