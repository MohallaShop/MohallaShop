import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional and falsy values', () => {
    expect(cn('base', false && 'no', true && 'yes', undefined, null)).toBe('base yes')
  })

  it('resolves tailwind conflicts (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
