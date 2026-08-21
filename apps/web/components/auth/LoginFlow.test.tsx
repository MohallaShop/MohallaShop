import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginFlow } from './LoginFlow'

const { replace, push, params, signInWithPassword, signUp, resend, getUser } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  params: { value: '' },
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(params.value),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithPassword, signUp, resend, getUser },
  }),
}))

const okSignIn = (roles: string[] = []) => ({
  error: null,
  data: {
    user: { app_metadata: { roles } },
    session: { access_token: 'token-123' },
  },
})

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  email = 'user@example.com',
  password = 'password123',
) {
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.type(screen.getByLabelText(/^password/i), password)
  await user.click(screen.getByRole('button', { name: /^sign in$/i }))
}

async function signUpForm(
  user: ReturnType<typeof userEvent.setup>,
  { name = 'Priya Sharma', email = 'new@example.com', password = 'password123' } = {},
) {
  await user.click(screen.getByRole('tab', { name: /create account/i }))
  await user.type(screen.getByLabelText(/your name/i), name)
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.type(screen.getByLabelText(/^password/i), password)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

beforeEach(() => {
  replace.mockReset()
  push.mockReset()
  signInWithPassword.mockReset()
  signUp.mockReset()
  resend.mockReset()
  getUser.mockReset()
  params.value = ''
  getUser.mockResolvedValue({ data: { user: null } })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('LoginFlow — sign in', () => {
  it('shows the sign-in form with both tabs', () => {
    render(<LoginFlow />)
    expect(screen.getByRole('tab', { name: /sign in/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
  })

  it('redirects a customer to /home after sign-in', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValue(okSignIn(['customer']))
    render(<LoginFlow />)
    await signIn(user)
    await waitFor(() =>
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      }),
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
  })

  it('routes shopkeeper, rider and admin roles to their own dashboards', async () => {
    const cases: Array<{ roles: string[]; expected: string }> = [
      { roles: ['shopkeeper'], expected: '/shop' },
      { roles: ['rider'], expected: '/rider/dashboard' },
      { roles: ['admin'], expected: '/admin/dashboard' },
    ]
    for (const { roles, expected } of cases) {
      const user = userEvent.setup()
      signInWithPassword.mockResolvedValue(okSignIn(roles))
      render(<LoginFlow />)
      await signIn(user)
      await waitFor(() => expect(replace).toHaveBeenCalledWith(expected))
      replace.mockReset()
      cleanup()
    }
  })

  it('honours a sanitized next parameter', async () => {
    const user = userEvent.setup()
    params.value = 'next=/cart'
    signInWithPassword.mockResolvedValue(okSignIn([]))
    render(<LoginFlow />)
    await signIn(user)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/cart'))
  })

  it('validates the email and password before submitting', async () => {
    const user = userEvent.setup()
    render(<LoginFlow />)
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
  })

  it('shows wrong-credentials copy with a signup link', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    render(<LoginFlow />)
    await signIn(user, 'user@example.com', 'wrongpass')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/wrong email or password/i),
    )
    expect(
      screen.getByRole('button', { name: /new here\? create an account/i }),
    ).toBeInTheDocument()
  })
})

describe('LoginFlow — sign up', () => {
  it('collects name, email and password on the create-account tab', async () => {
    const user = userEvent.setup()
    render(<LoginFlow />)
    await user.click(screen.getByRole('tab', { name: /create account/i }))
    expect(screen.getByRole('tab', { name: /create account/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
  })

  it('requires an 8+ character password', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue({ error: null, data: {} })
    render(<LoginFlow />)
    await signUpForm(user, { password: 'short' })
    expect(signUp).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8 characters/i)
  })

  it('shows the check-your-email screen when confirmation is required', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue({ error: null, data: { user: null, session: null } })
    render(<LoginFlow />)
    await signUpForm(user)
    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@example.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { display_name: 'Priya Sharma' },
          }),
        }),
      ),
    )
    expect(screen.getByText(/check your email/i)).toBeInTheDocument()
    expect(screen.getByText(/new@example.com/i)).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('signs the new user in immediately when no confirmation is needed', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue(okSignIn([]))
    render(<LoginFlow />)
    await signUpForm(user)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
  })

  it('offers sign-in when the email is already registered', async () => {
    const user = userEvent.setup()
    signUp.mockResolvedValue({
      error: { message: 'User already registered' },
    })
    render(<LoginFlow />)
    await signUpForm(user)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/already registered/i))
    expect(screen.getByRole('button', { name: /sign in instead/i })).toBeInTheDocument()
  })
})

describe('LoginFlow — email verification', () => {
  it('routes an unverified sign-in to the verification screen with resend', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValue({
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    })
    render(<LoginFlow />)
    await signIn(user)
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /resend link in/i })).toBeDisabled()
  })

  it('can go back from the verification screen to sign in', async () => {
    const user = userEvent.setup()
    signInWithPassword.mockResolvedValue({
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    })
    render(<LoginFlow />)
    await signIn(user)
    await waitFor(() => expect(screen.getByText(/check your email/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /back to sign in/i }))
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument()
  })
})

describe('LoginFlow — sessions', () => {
  it('redirects away immediately when already authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: { roles: ['customer'] } } } })
    render(<LoginFlow />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
  })
})
