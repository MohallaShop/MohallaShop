import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginFlow } from './LoginFlow'

const { replace, push, params, signInWithOtp, verifyOtp, getUser } = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  params: { value: '' },
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(params.value),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOtp, verifyOtp, getUser },
  }),
}))

const okSession = (roles: string[] = []) => ({
  error: null,
  data: {
    session: { access_token: 'token-123' },
    user: { app_metadata: { roles } },
  },
})

async function enterEmailOtp(
  user: ReturnType<typeof userEvent.setup>,
  email = 'user@example.com',
  code = '123456',
) {
  await user.type(screen.getByLabelText(/email address/i), email)
  await user.click(screen.getByRole('button', { name: /send code/i }))
  await waitFor(() => expect(screen.getByLabelText(/enter the 6-digit code/i)).toBeInTheDocument())
  await user.type(screen.getByLabelText(/enter the 6-digit code/i), code)
  await user.click(screen.getByRole('button', { name: /verify & sign in/i }))
}

async function pickRole(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: new RegExp(name) }))
}

beforeEach(() => {
  replace.mockReset()
  push.mockReset()
  signInWithOtp.mockReset()
  verifyOtp.mockReset()
  getUser.mockReset()
  params.value = ''
  getUser.mockResolvedValue({ data: { user: null } })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

describe('LoginFlow — role entry', () => {
  it('shows role selection first with customer as the primary option', () => {
    render(<LoginFlow />)
    expect(screen.getByRole('heading', { name: /who are you/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /customer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /shopkeeper/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /rider/i })).toBeInTheDocument()
    expect(screen.getByText(/platform administrator\? sign in/i)).toBeInTheDocument()
  })

  it('shows auth methods after choosing a role; only Email is active', async () => {
    const user = userEvent.setup()
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    expect(screen.getByRole('heading', { name: /welcome to mohallashop/i })).toBeInTheDocument()

    const google = screen.getByRole('button', { name: /continue with google/i })
    expect(google).toBeDisabled()
    expect(google).toHaveTextContent(/coming soon/i)

    const phone = screen.getByRole('button', { name: /continue with phone/i })
    expect(phone).toBeDisabled()
    expect(phone).toHaveTextContent(/coming soon/i)

    const email = screen.getByRole('button', { name: /continue with email/i })
    expect(email).toBeEnabled()
    expect(email).not.toHaveTextContent(/coming soon/i)
  })

  it('lets the user go back and change role', async () => {
    const user = userEvent.setup()
    render(<LoginFlow />)
    await pickRole(user, 'Shopkeeper')
    await user.click(screen.getByRole('button', { name: /change role/i }))
    expect(screen.getByRole('heading', { name: /who are you/i })).toBeInTheDocument()
  })
})

describe('LoginFlow — email authentication', () => {
  it('validates the email address before sending', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await user.type(screen.getByLabelText(/email address/i), 'not-an-email')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/valid email/i)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends an OTP and redirects a customer to /home after verify', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue(okSession(['customer']))
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await enterEmailOtp(user)
    await waitFor(() =>
      expect(signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com' }),
      ),
    )
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        email: 'user@example.com',
        token: '123456',
        type: 'email',
      }),
    )
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
  })

  it('routes an existing shopkeeper to /shop regardless of selection', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue(okSession(['shopkeeper']))
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await enterEmailOtp(user)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/shop'))
  })

  it('routes rider and admin roles to their own dashboards', async () => {
    const cases: Array<{ roles: string[]; expected: string }> = [
      { roles: ['rider'], expected: '/rider/dashboard' },
      { roles: ['admin'], expected: '/admin/dashboard' },
    ]
    for (const { roles, expected } of cases) {
      const user = userEvent.setup()
      signInWithOtp.mockResolvedValue({ error: null })
      verifyOtp.mockResolvedValue(okSession(roles))
      render(<LoginFlow />)
      await pickRole(user, 'Customer')
      await user.click(screen.getByRole('button', { name: /continue with email/i }))
      await enterEmailOtp(user)
      await waitFor(() => expect(replace).toHaveBeenCalledWith(expected))
      replace.mockReset()
      cleanup()
    }
  })

  it('honours a sanitized next parameter', async () => {
    const user = userEvent.setup()
    params.value = 'next=/cart'
    signInWithOtp.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue(okSession([]))
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await enterEmailOtp(user)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/cart'))
  })

  it('rejects an invalid OTP without calling verifyOtp', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/enter the 6-digit code/i)).toBeInTheDocument(),
    )
    await user.type(screen.getByLabelText(/enter the 6-digit code/i), '12')
    await user.click(screen.getByRole('button', { name: /verify & sign in/i }))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/numeric code/i)
  })

  it('surfaces an OTP send failure', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({
      error: { message: 'Email rate limit exceeded' },
    })
    render(<LoginFlow />)
    await pickRole(user, 'Customer')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/rate limit exceeded/i))
  })
})

describe('LoginFlow — sessions and security', () => {
  it('redirects away immediately when already authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: { app_metadata: { roles: ['customer'] } } } })
    render(<LoginFlow />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
  })

  it('does not let role selection grant shopkeeper access', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue(okSession(['customer']))
    render(<LoginFlow />)
    await pickRole(user, 'Shopkeeper')
    await user.click(screen.getByRole('button', { name: /continue with email/i }))
    await enterEmailOtp(user)
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/home'))
    expect(replace).not.toHaveBeenCalledWith('/shop')
  })
})
