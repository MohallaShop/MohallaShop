import { describe, expect, it } from 'vitest'
import { isEntryRole, landingFor, rolesFromAppMetadata, sanitizeNext } from './redirect'

describe('landingFor', () => {
  it('defaults unrecognized/empty roles to the customer marketplace', () => {
    expect(landingFor([])).toBe('/home')
    expect(landingFor(['space-marine'])).toBe('/home')
  })

  it('routes each role to its own surface', () => {
    expect(landingFor(['customer'])).toBe('/home')
    expect(landingFor(['shopkeeper'])).toBe('/shop')
    expect(landingFor(['rider'])).toBe('/rider/dashboard')
    expect(landingFor(['admin'])).toBe('/admin/dashboard')
    expect(landingFor(['super_admin'])).toBe('/admin/dashboard')
  })

  it('prefers the highest-privileged role', () => {
    expect(landingFor(['customer', 'shopkeeper'])).toBe('/shop')
    expect(landingFor(['shopkeeper', 'admin'])).toBe('/admin/dashboard')
  })
})

describe('sanitizeNext', () => {
  it('accepts same-site paths', () => {
    expect(sanitizeNext('/cart')).toBe('/cart')
    expect(sanitizeNext('/shop/orders?page=2')).toBe('/shop/orders?page=2')
    expect(sanitizeNext(null)).toBeNull()
  })

  it('rejects protocol-relative and scheme URLs', () => {
    expect(sanitizeNext('https://evil.example')).toBeNull()
    expect(sanitizeNext('//evil.example')).toBeNull()
    expect(sanitizeNext('/\\evil.example')).toBeNull()
    expect(sanitizeNext('/safe\\@evil')).toBeNull()
  })
})

describe('rolesFromAppMetadata', () => {
  it('handles array, string and missing role claims', () => {
    expect(rolesFromAppMetadata({ roles: ['customer', 'shopkeeper'] })).toEqual([
      'customer',
      'shopkeeper',
    ])
    expect(rolesFromAppMetadata({ roles: 'rider' })).toEqual(['rider'])
    expect(rolesFromAppMetadata({})).toEqual([])
    expect(rolesFromAppMetadata(null)).toEqual([])
    expect(rolesFromAppMetadata({ roles: ['customer', 42] })).toEqual(['customer'])
  })
})

describe('isEntryRole', () => {
  it('accepts only known entry roles', () => {
    expect(isEntryRole('customer')).toBe(true)
    expect(isEntryRole('admin')).toBe(true)
    expect(isEntryRole('super_admin')).toBe(false)
    expect(isEntryRole(null)).toBe(false)
  })
})
