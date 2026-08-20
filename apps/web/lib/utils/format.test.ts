import { describe, expect, it } from 'vitest'
import { formatDateTime, formatMoney, statusMeta } from './format'

describe('formatMoney', () => {
  it('formats backend string money as INR', () => {
    expect(formatMoney('199.00')).toBe('₹199')
    expect(formatMoney('0.00')).toBe('₹0')
  })

  it('keeps two decimals when needed', () => {
    expect(formatMoney('12.50')).toBe('₹12.50')
  })

  it('handles nullish values', () => {
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney(undefined)).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('formats ISO dates', () => {
    expect(formatDateTime('2026-08-09T11:30:00Z')).toContain('2026')
  })

  it('handles missing values', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})

describe('statusMeta', () => {
  it('maps every backend status', () => {
    expect(statusMeta('pending_shop').label).toBe('Awaiting shop')
    expect(statusMeta('pending_shop').tone).toBe('warning')
    expect(statusMeta('ready_for_pickup').label).toBe('Ready for pickup')
    expect(statusMeta('ready_for_pickup').tone).toBe('success')
    expect(statusMeta('cancelled').tone).toBe('muted')
    expect(statusMeta('rejected').tone).toBe('danger')
  })

  it('falls back for unknown statuses', () => {
    expect(statusMeta('weird').label).toBe('weird')
  })
})
