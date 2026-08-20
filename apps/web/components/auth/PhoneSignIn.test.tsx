import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhoneSignIn } from './PhoneSignIn'

/**
 * Direct coverage for the phone OTP implementation. The method is currently
 * disabled in the login UI (AUTH_METHODS.phone.enabled = false, pending SMS
 * provider configuration) but the implementation stays intact and tested so
 * it can be re-enabled cleanly.
 */

const { signInWithOtp, verifyOtp } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithOtp, verifyOtp } }),
}))

const onSuccess = vi.fn()

beforeEach(() => {
  signInWithOtp.mockReset()
  verifyOtp.mockReset()
  onSuccess.mockReset()
})

describe('PhoneSignIn', () => {
  it('validates the phone number before sending', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '9876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/country code/i)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('sends an OTP and advances to the code step', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledWith({ phone: '+919876543210' }))
    expect(screen.getByLabelText(/enter the 6-digit code sent to/i)).toBeInTheDocument()
  })

  it('surfaces an OTP send failure', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({
      error: { message: 'Number not registered' },
    })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/number not registered/i),
    )
  })

  it('rejects an invalid OTP without calling verifyOtp', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/enter the 6-digit code/i)).toBeInTheDocument(),
    )
    await user.type(screen.getByLabelText(/enter the 6-digit code/i), '12')
    await user.click(screen.getByRole('button', { name: /verify & sign in/i }))
    expect(verifyOtp).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/numeric code/i)
  })

  it('verifies the OTP and reports success with the session token', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    verifyOtp.mockResolvedValue({
      error: null,
      data: {
        session: { access_token: 'token-123' },
        user: { app_metadata: { roles: ['customer'] } },
      },
    })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/enter the 6-digit code/i)).toBeInTheDocument(),
    )
    await user.type(screen.getByLabelText(/enter the 6-digit code/i), '123456')
    await user.click(screen.getByRole('button', { name: /verify & sign in/i }))
    await waitFor(() =>
      expect(verifyOtp).toHaveBeenCalledWith({
        phone: '+919876543210',
        token: '123456',
        type: 'sms',
      }),
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(onSuccess.mock.calls[0]?.[1]).toBe('token-123')
  })

  it('shows a resend countdown and allows changing the number', async () => {
    const user = userEvent.setup()
    signInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneSignIn onSuccess={onSuccess} />)
    await user.type(screen.getByLabelText(/phone number/i), '+919876543210')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/enter the 6-digit code/i)).toBeInTheDocument(),
    )

    const resend = screen.getByRole('button', { name: /resend in 30s/i })
    expect(resend).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /change number/i }))
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
  })
})
