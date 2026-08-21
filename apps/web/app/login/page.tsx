import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginFlow } from '@/components/auth/LoginFlow'
export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in or create your MohallaShop account with email and password.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <main className="bg-background flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="bg-brand-600 mx-auto grid h-12 w-12 place-items-center rounded-xl text-white">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 9h16l-1-5H5L4 9Z" />
              <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
              <path d="M9 20v-5h6v5" />
            </svg>
          </span>
          <h2 className="text-content mt-4 text-2xl font-bold">MohallaShop</h2>
          <p className="text-muted mt-1 text-sm">Your local shops, delivered.</p>
        </div>
        <div className="bg-surface border-border shadow-card rounded-2xl border p-6 md:p-8">
          <Suspense fallback={null}>
            <LoginFlow />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
