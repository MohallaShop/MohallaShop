'use client'

import { useState } from 'react'
import { MapPinIcon } from '@/components/icons'
import { cn } from '@/lib/utils/cn'

type Status = 'idle' | 'requesting' | 'allowed' | 'blocked' | 'unsupported'

export function LocationPermissionButton({
  variant = 'rail',
  active = false,
}: {
  variant?: 'rail' | 'bottom' | 'header'
  active?: boolean
}) {
  const [status, setStatus] = useState<Status>('idle')

  function requestLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    navigator.geolocation.getCurrentPosition(
      () => setStatus('allowed'),
      () => setStatus('blocked'),
      { enableHighAccuracy: true, maximumAge: 300_000, timeout: 10_000 },
    )
  }

  const label = status === 'requesting' ? 'Locating' : 'Location'
  const railStatus =
    status === 'allowed'
      ? 'Using current area'
      : status === 'blocked'
        ? 'Permission blocked'
        : status === 'unsupported'
          ? 'Not supported'
          : 'Use current location'

  if (variant === 'bottom') {
    return (
      <button
        type="button"
        onClick={requestLocation}
        aria-label="Use current location"
        className={cn(
          'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-none transition min-[360px]:text-[11px]',
          active
            ? 'bg-brand-500/10 text-brand-700 dark:text-brand-300'
            : 'text-muted hover:bg-surface-hover hover:text-content',
        )}
      >
        <MapPinIcon className="h-5 w-5 shrink-0 min-[360px]:h-5.5 min-[360px]:w-5.5" />
        <span className="max-w-full truncate">{label}</span>
      </button>
    )
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={requestLocation}
        aria-label="Use current location"
        className="border-border bg-background text-content hover:bg-surface-hover flex h-10 min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-sm transition"
      >
        <span className="bg-brand-500/10 text-brand-700 dark:text-brand-300 grid h-7 w-7 shrink-0 place-items-center rounded-md">
          <MapPinIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-bold">{label}</span>
          <span className="text-muted block truncate text-[11px] font-medium">{railStatus}</span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={requestLocation}
      aria-label="Use current location"
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150',
        active
          ? 'bg-brand-100/80 text-brand-700 shadow-sm dark:bg-brand-950/50 dark:text-brand-300'
          : 'text-content/75 hover:bg-surface-hover hover:text-content',
      )}
    >
      <MapPinIcon
        className={cn(
          'h-5 w-5 shrink-0 transition-colors',
          active ? 'text-brand-600 dark:text-brand-400' : 'text-muted group-hover:text-brand-500',
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="text-muted block truncate text-[11px] font-medium">{railStatus}</span>
      </span>
    </button>
  )
}
