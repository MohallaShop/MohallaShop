import { describe, expect, it } from 'vitest'
import { ApiError } from './client'
import { classifyError, isAuthError, isNotFound } from './errors'

describe('classifyError', () => {
  it('maps 401 to an unauthenticated session message', () => {
    const err = new ApiError(401, { code: 'unauthenticated', message: 'Invalid token' })
    const out = classifyError(err)
    expect(out.kind).toBe('unauthenticated')
    expect(out.message).toMatch(/session/i)
    expect(out.code).toBe('unauthenticated')
  })

  it('maps 403 to forbidden', () => {
    const out = classifyError(new ApiError(403, { code: 'forbidden', message: 'no' }))
    expect(out.kind).toBe('forbidden')
  })

  it('maps 404 to not_found', () => {
    const out = classifyError(new ApiError(404, { code: 'not_found', message: 'no' }))
    expect(out.kind).toBe('not_found')
  })

  it('maps 409 and preserves the backend conflict code', () => {
    const out = classifyError(
      new ApiError(409, { code: 'cart_cross_shop', message: 'Cart already has another shop' }),
    )
    expect(out.kind).toBe('conflict')
    expect(out.code).toBe('cart_cross_shop')
    expect(out.message).toContain('another shop')
  })

  it('maps 429 to rate limit', () => {
    const out = classifyError(new ApiError(429, { code: 'rate_limit', message: 'slow down' }))
    expect(out.kind).toBe('rate_limit')
  })

  it('maps 422 to validation', () => {
    const out = classifyError(new ApiError(422, { code: 'validation_failed', message: 'bad' }))
    expect(out.kind).toBe('validation')
  })

  it('maps 500 to a server message without leaking internals', () => {
    const out = classifyError(
      new ApiError(500, { code: 'internal_error', message: 'SELECT * FROM secrets' }),
    )
    expect(out.kind).toBe('server')
    expect(out.message).not.toContain('SELECT')
  })

  it('maps network failures (fetch TypeError) to network', () => {
    const out = classifyError(new TypeError('Failed to fetch'))
    expect(out.kind).toBe('network')
  })

  it('maps unknown errors to unknown', () => {
    expect(classifyError(new Error('boom')).kind).toBe('unknown')
  })
})

describe('isAuthError / isNotFound', () => {
  it('detects 401 and 404', () => {
    expect(isAuthError(new ApiError(401, { code: 'x', message: 'x' }))).toBe(true)
    expect(isAuthError(new Error('no'))).toBe(false)
    expect(isNotFound(new ApiError(404, { code: 'x', message: 'x' }))).toBe(true)
  })
})
