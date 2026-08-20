import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('is disabled while loading', () => {
    render(<Button isLoading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies the primary variant classes by default', () => {
    render(<Button>Primary</Button>)
    expect(screen.getByRole('button').className).toContain('bg-brand-600')
  })
})
