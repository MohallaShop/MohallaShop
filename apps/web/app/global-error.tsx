'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary: replaces the root layout, so it must render its own
 * <html>/<body> (Next.js requirement). Styling is inline only — globals.css is
 * not guaranteed to have loaded when this renders.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Surface the digest in the browser console for bug reports.
    console.error('global-error boundary:', error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8f7fb' }}>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              textAlign: 'center',
              background: '#fff',
              border: '1px solid #e9e7f2',
              borderRadius: '1rem',
              padding: '2rem',
              boxShadow: '0 8px 24px rgba(80, 63, 205, 0.08)',
            }}
          >
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#b4232a' }}>
              MohallaShop couldn&apos;t load
            </h1>
            <p style={{ color: '#5b5870', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              An unexpected error occurred. Reload the page to try again — if it keeps happening,
              please contact support.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1.25rem',
                background: '#503fcd',
                color: '#fff',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.65rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
