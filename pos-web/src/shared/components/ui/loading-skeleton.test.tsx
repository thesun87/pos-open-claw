import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingSkeleton } from './loading-skeleton'

describe('LoadingSkeleton', () => {
  it('renders with default props and has status role', () => {
    render(<LoadingSkeleton />)
    const el = screen.getByRole('status', { name: /đang tải/i })
    expect(el).toBeInTheDocument()
  })

  it('renders correct number of lines', () => {
    const { container } = render(<LoadingSkeleton lines={5} />)
    const status = container.querySelector('[role="status"]')
    expect(status?.children).toHaveLength(5)
  })

  it('renders Card variant with status role', () => {
    render(<LoadingSkeleton.Card />)
    const el = screen.getByRole('status', { name: /đang tải/i })
    expect(el).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<LoadingSkeleton className="custom-class" />)
    const el = screen.getByRole('status')
    expect(el).toHaveClass('custom-class')
  })
})
